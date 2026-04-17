import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { HashService } from '../services/HashService';
import { io } from '../server';
import { MLServiceClient } from '../services/MLServiceClient';

export class VisitorController {
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
      if (!cpf || !name || !birthYear || !origin) {
        return res.status(400).json({ error: 'Missing required visitor fields' });
      }

      const cpfHash = await HashService.hashCPF(cpf);

      // Check for existing visitor
      let visitor = await prisma.visitor.findUnique({
        where: { cpfHash }
      });

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
          cpfHash,
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
        visitorHash: cpfHash,
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
        io.emit('occupancy_update', {
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
    const { cpf } = req.body;

    if (!cpf) {
      return res.status(400).json({ error: 'CPF is required' });
    }

    try {
      const cpfHash = await HashService.hashCPF(cpf);
      const visitor = await prisma.visitor.findUnique({
        where: { cpfHash },
        include: {
          checkins: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

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
