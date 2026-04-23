import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { HashService } from '../services/HashService';
import { getIO } from '../lib/socket';
import { MLServiceClient } from '../services/MLServiceClient';

// RFC-5321-aligned email validator (mirrors frontend isValidEmail)
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

export class VisitorController {
  constructor() {
    this.register = this.register.bind(this);
    this.identify = this.identify.bind(this);
  }

  /**
   * Dedicated registration endpoint for new visitors.
   * Handles the complete "Primeiro Pulso" payload.
   */
  async register(req: Request, res: Response) {
    const {
      cpf,
      name,
      birthYear,
      gender,
      origin,
      originDetail,
      accessibilityNeeds,
      accessibilityDetail,
      exhibitionId,
      channel
    } = req.body;

    try {
      // Require at least cpf OR email (email flow)
      const identity = cpf || req.body.email;
      if (!identity) {
        return res.status(400).json({ error: 'CPF or email is required' });
      }
      if (req.body.email && !isValidEmail(req.body.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      if (!name || !birthYear || !origin) {
        return res.status(400).json({ error: 'Missing required visitor fields' });
      }

      let cpfHash: string | undefined;
      let emailHash: string | undefined;
      let visitor: any = null;

      if (cpf) {
        cpfHash = await HashService.hashCPF(cpf);
        visitor = await prisma.visitor.findUnique({ where: { cpfHash } });
      } else if (req.body.email) {
        emailHash = await HashService.hashEmail(req.body.email);
        visitor = await prisma.visitor.findUnique({ where: { emailHash } });
      }

      if (visitor) {
        return res.status(409).json({ 
          error: 'Visitor already registered',
          success: false,
          firstName: visitor.name.split(' ')[0]
        });
      }

      const mergedAccessibility = Array.isArray(accessibilityNeeds) 
        ? (accessibilityDetail ? [...accessibilityNeeds, `OUTRA_DETALHE:${accessibilityDetail}`] : accessibilityNeeds)
        : [];

      // Create visitor with new fields
      visitor = await prisma.visitor.create({
        data: {
          cpfHash: cpfHash || null,
          emailHash: emailHash || null,
          name,
          birthYear,
          gender: gender || 'PREFIRO_NAO_DIZER',
          origin,
          originDetail: originDetail || null,
          accessibilityNeeds: mergedAccessibility, // Json field
        }
      });

      // Ingest into ML Engine Feature Store (Intelligence Layer)
      // This is non-blocking to ensure fast check-in
      MLServiceClient.ingestVisitorFeatures({
        visitorHash: cpfHash || emailHash || 'unknown',
        birthYear: visitor.birthYear,
        gender: visitor.gender,
        origin: visitor.origin,
        accessibilityNeeds: (visitor.accessibilityNeeds as string[]) || [],
        timestamp: new Date().toISOString()
      });

      // Create initial checkin
      const validChannels = ['REDES_SOCIAIS', 'INDICACAO', 'PASSOU_NA_FRENTE', 'JORNAL_TV', 'ESCOLA_FACULDADE', 'OUTRO'];
      const safeChannel = validChannels.includes(channel) ? channel : 'OUTRO';

      const checkin = await prisma.checkin.create({
        data: {
          visitorId: visitor.id,
          exhibitionId: exhibitionId || 'default-exhibition',
          channel: safeChannel as any
        }
      });

      // Emit real-time event
      if (exhibitionId) {
        getIO().emit('occupancy_update', {
          type: 'checkin',
          exhibitionId,
          timestamp: new Date()
        });
      }

      return res.status(201).json({
        success: true,
        visitorId: visitor.id,
        checkinId: checkin.id,
        message: 'Registration successful'
      });

    } catch (error) {
      console.error('[VisitorController] register error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Recognition endpoint for returning visitors.
   */
  async identify(req: Request, res: Response) {
    const { cpf, email } = req.body;

    if (!cpf && !email) {
      return res.status(400).json({ error: 'CPF or email is required' });
    }
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    try {
      let visitor: any = null;

      if (cpf) {
        const cpfHash = await HashService.hashCPF(cpf);
        visitor = await prisma.visitor.findUnique({
          where: { cpfHash },
          include: {
            checkins: { orderBy: { createdAt: 'desc' }, take: 1 }
          }
        });
      } else if (email) {
        const emailHash = await HashService.hashEmail(email);
        visitor = await prisma.visitor.findUnique({
          where: { emailHash },
          include: {
            checkins: { orderBy: { createdAt: 'desc' }, take: 1 }
          }
        });
      }

      if (!visitor) {
        return res.status(404).json({ error: 'Visitor not found' });
      }

      return res.json({
        success: true,
        visitor: {
          id: visitor.id,
          name: visitor.name,
          firstName: visitor.name.split(' ')[0],
          birthYear: visitor.birthYear,
          gender: visitor.gender,
          origin: visitor.origin,
          accessibilityNeeds: visitor.accessibilityNeeds,
          lastCheckin: visitor.checkins[0] || null
        }
      });
    } catch (error) {
      console.error('[VisitorController] identify error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
