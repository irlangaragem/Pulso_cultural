import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { HashService } from '../services/HashService';
import { io } from '../server';

export class CheckinController {
  async create(req: Request, res: Response) {
    const { 
      cpf, 
      name, 
      birthYear, 
      gender, 
      origin, 
      exhibitionId, 
      channel 
    } = req.body;

    try {
      if (!cpf) {
        return res.status(400).json({ error: 'CPF is required' });
      }
      const cpfHash = await HashService.hashCPF(cpf);

      // Find or create visitor
      let visitor = await prisma.visitor.findUnique({
        where: { cpfHash }
      });

      // Ensure channel is valid Enum
      const validChannels = ['REDES_SOCIAIS', 'INDICACAO', 'PASSOU_NA_FRENTE', 'JORNAL_TV', 'ESCOLA_FACULDADE', 'OUTRO'];
      const safeChannel = validChannels.includes(channel) ? channel : 'OUTRO';

      // Ensure origin is valid Enum
      const validOrigins = ['SALVADOR', 'INTERIOR_BA', 'OUTRO_ESTADO', 'INTERNACIONAL'];
      const safeOrigin = validOrigins.includes(origin) ? origin : 'SALVADOR';

      if (!visitor) {
        visitor = await prisma.visitor.create({
          data: {
            cpfHash,
            name,
            birthYear,
            gender,
            origin: safeOrigin
          }
        });
      }

      // Create checkin
      const checkin = await prisma.checkin.create({
        data: {
          visitorId: visitor.id,
          exhibitionId,
          channel: safeChannel
        }
      });

      // Emit event for real-time dashboard
      io.emit('occupancy_update', {
        type: 'checkin',
        exhibitionId,
        timestamp: new Date()
      });

      return res.status(201).json(checkin);
    } catch (error) {
      console.error('Checkin error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async batchCreate(req: Request, res: Response) {
    const checkins = req.body; // Expecting an array

    if (!Array.isArray(checkins)) {
      return res.status(400).json({ error: 'Body must be an array of checkins' });
    }

    try {
      const results = [];
      const validChannels = ['REDES_SOCIAIS', 'INDICACAO', 'PASSOU_NA_FRENTE', 'JORNAL_TV', 'ESCOLA_FACULDADE', 'OUTRO'];
      const validOrigins = ['SALVADOR', 'INTERIOR_BA', 'OUTRO_ESTADO', 'INTERNACIONAL'];

      for (const item of checkins) {
        if (!item.cpf && !item.cpfHash) continue; // Skip invalid entries
        
        const cpfHash = item.cpfHash || await HashService.hashCPF(item.cpf);
        
        const safeOrigin = validOrigins.includes(item.origin) ? item.origin : 'SALVADOR';
        const safeChannel = validChannels.includes(item.channel) ? item.channel : 'OUTRO';

        let visitor = await prisma.visitor.findUnique({ where: { cpfHash } });
        if (!visitor) {
          visitor = await prisma.visitor.create({
            data: {
              cpfHash,
              name: item.name || 'Visitante',
              birthYear: item.birthYear || new Date().getFullYear(),
              gender: item.gender || 'PREFIRO_NAO_DIZER',
              origin: safeOrigin
            }
          });
        }

        const checkin = await prisma.checkin.create({
          data: {
            visitorId: visitor.id,
            exhibitionId: item.exhibitionId || 'default-exhibition',
            channel: safeChannel,
            createdAt: item.timestamp ? new Date(item.timestamp) : new Date()
          }
        });
        results.push(checkin);
      }

      return res.status(201).json({ success: true, count: results.length });
    } catch (error) {
      console.error('Batch checkin error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async verify(req: Request, res: Response) {
    const { cpf } = req.body;

    if (!cpf) {
      return res.status(400).json({ error: 'CPF is required' });
    }

    try {
      const cpfHash = await HashService.hashCPF(cpf);
      const visitor = await prisma.visitor.findUnique({
        where: { cpfHash }
      });

      if (!visitor) {
        return res.status(404).json({ error: 'Visitor not found' });
      }

      // Privacy: Only return the first name and minimal info
      // Complying with "Dashboard Aggregates Only" and minimizing PII return.
      const firstName = visitor.name.split(' ')[0];

      return res.status(200).json({
        success: true,
        firstName,
        origin: visitor.origin,
        // birthYear and gender are NOT returned to minimize PII exposure
      });
    } catch (error) {
      console.error('Verify error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Dedicated endpoint for real camera layer ingestion (YOLOv8/MediaPipe layer)
   */
  async ingestCameraData(req: Request, res: Response) {
    const { type, exhibitionId, timestamp, secret } = req.body;

    // Require env var — no hardcoded fallback. If absent, camera ingest is disabled.
    const APP_SECRET = process.env.CAMERA_SECRET;
    if (!APP_SECRET) {
      return res.status(503).json({ error: 'Camera ingest not configured' });
    }
    if (secret !== APP_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      // Find a camera to associate - using 'active' field
      const camera = await prisma.camera.findFirst({
        where: { active: true }
      }) || await prisma.camera.findFirst();

      if (!camera) {
        return res.status(404).json({ error: 'No camera registered in system' });
      }

      const count = await prisma.cameraCount.create({
        data: {
          cameraId: camera.id,
          exhibitionId,
          type: type === 'ENTRADA' ? 'ENTRADA' : 'SAIDA',
          timestamp: timestamp ? new Date(timestamp) : new Date()
        }
      });

      io.emit('occupancy_update', {
        type: 'camera_count',
        countType: count.type,
        exhibitionId,
        timestamp: count.timestamp
      });

      return res.status(201).json({ success: true, id: count.id });
    } catch (error) {
      console.error('Ingest error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getStats(req: Request, res: Response) {
    const { exhibitionId } = req.params;

    try {
      // Mocked stats for MVP
      const totalCheckins = await prisma.checkin.count({
        where: { exhibitionId }
      });

      // Let's assume some camera counts as well if they exist
      const entries = await prisma.cameraCount.count({
        where: { type: 'ENTRADA' }
      });

      const exits = await prisma.cameraCount.count({
        where: { type: 'SAIDA' }
      });

      return res.json({
        totalCheckins,
        currentOccupancy: entries - exits > 0 ? entries - exits : totalCheckins,
        entries,
        exits
      });
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async simulateCount(req: Request, res: Response) {
    const { type, exhibitionId } = req.body;

    try {
      // Find a camera to associate the count
      const camera = await prisma.camera.findFirst();
      
      if (!camera) {
        return res.status(404).json({ error: 'No camera found' });
      }

      const count = await prisma.cameraCount.create({
        data: {
          cameraId: camera.id,
          exhibitionId,
          type
        }
      });

      io.emit('occupancy_update', {
        type: 'camera_count',
        countType: type,
        exhibitionId,
        timestamp: new Date()
      });

      return res.status(201).json(count);
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
