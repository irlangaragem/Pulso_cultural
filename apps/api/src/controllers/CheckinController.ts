import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { HashService } from '../services/HashService';
import { getIO } from '../lib/socket';
import { env } from '../config/env';
import { invalidateDashboardCache } from './DashboardController';

const VALID_CHANNELS = ['REDES_SOCIAIS', 'INDICACAO', 'PASSOU_NA_FRENTE', 'JORNAL_TV', 'ESCOLA_FACULDADE', 'OUTRO'];
const VALID_ORIGINS = ['SALVADOR', 'INTERIOR_BA', 'OUTRO_ESTADO', 'INTERNACIONAL'];

export class CheckinController {
  constructor() {
    this.create = this.create.bind(this);
    this.batchCreate = this.batchCreate.bind(this);
    this.verify = this.verify.bind(this);
    this.ingestCameraData = this.ingestCameraData.bind(this);
    this.getStats = this.getStats.bind(this);
    this.simulateCount = this.simulateCount.bind(this);
  }

  async create(req: Request, res: Response) {
    const { cpf, name, birthYear, gender, origin, exhibitionId, channel } = req.body;

    if (!cpf) return res.status(400).json({ error: 'CPF is required' });
    if (!exhibitionId) return res.status(400).json({ error: 'exhibitionId is required' });

    try {
      const cpfHash = await HashService.hashCPF(cpf);

      let visitor = await prisma.visitor.findUnique({ where: { cpfHash } });

      const safeChannel = VALID_CHANNELS.includes(channel) ? channel : 'OUTRO';
      const safeOrigin = VALID_ORIGINS.includes(origin) ? origin : null;

      if (!visitor) {
        if (!name || !birthYear || !safeOrigin) {
          return res.status(400).json({
            error: 'Visitor data incomplete: name, birthYear and origin are required to create a new visitor.',
          });
        }
        visitor = await prisma.visitor.create({
          data: { cpfHash, name, birthYear, gender, origin: safeOrigin },
        });
      }

      const checkin = await prisma.checkin.create({
        data: { visitorId: visitor.id, exhibitionId, channel: safeChannel },
      });

      invalidateDashboardCache();
      getIO().emit('occupancy_update', {
        type: 'checkin',
        exhibitionId,
        timestamp: new Date(),
      });

      return res.status(201).json(checkin);
    } catch (error) {
      console.error('[CheckinController.create] error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Bulk create from offline sync queue.
   * Each item must include a raw `cpf`. Pre-computed `cpfHash` is rejected
   * (SEC-10: clients must not be able to forge identity).
   */
  async batchCreate(req: Request, res: Response) {
    const checkins = req.body;
    if (!Array.isArray(checkins)) {
      return res.status(400).json({ error: 'Body must be an array of checkins' });
    }

    try {
      const accepted: any[] = [];
      const rejected: { index: number; reason: string }[] = [];

      for (let i = 0; i < checkins.length; i++) {
        const item = checkins[i];

        if (item.cpfHash && !item.cpf) {
          rejected.push({ index: i, reason: 'cpfHash from client is not accepted; send raw cpf' });
          continue;
        }
        if (!item.cpf) {
          rejected.push({ index: i, reason: 'cpf is required' });
          continue;
        }
        if (!item.exhibitionId) {
          rejected.push({ index: i, reason: 'exhibitionId is required' });
          continue;
        }

        const cpfHash = await HashService.hashCPF(item.cpf);
        const safeChannel = VALID_CHANNELS.includes(item.channel) ? item.channel : 'OUTRO';
        const safeOrigin = VALID_ORIGINS.includes(item.origin) ? item.origin : null;

        let visitor = await prisma.visitor.findUnique({ where: { cpfHash } });
        if (!visitor) {
          if (!item.name || !item.birthYear || !safeOrigin) {
            rejected.push({ index: i, reason: 'visitor not found and cannot be created without name, birthYear and origin' });
            continue;
          }
          visitor = await prisma.visitor.create({
            data: {
              cpfHash,
              name: item.name,
              birthYear: item.birthYear,
              gender: item.gender || 'PREFIRO_NAO_DIZER',
              origin: safeOrigin,
            },
          });
        }

        const checkin = await prisma.checkin.create({
          data: {
            visitorId: visitor.id,
            exhibitionId: item.exhibitionId,
            channel: safeChannel,
            createdAt: item.timestamp ? new Date(item.timestamp) : new Date(),
          },
        });
        accepted.push(checkin);
      }

      return res.status(201).json({ success: true, count: accepted.length, rejected });
    } catch (error) {
      console.error('[CheckinController.batchCreate] error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /checkins/verify
   * Returns existence boolean and a masked first name. No origin / no exact name.
   * (SEC-09 mitigation: enumeration is still rate-limited; the payload is minimal.)
   */
  async verify(req: Request, res: Response) {
    const { cpf } = req.body;
    if (!cpf) return res.status(400).json({ error: 'CPF is required' });

    try {
      const cpfHash = await HashService.hashCPF(cpf);
      const visitor = await prisma.visitor.findUnique({ where: { cpfHash } });

      if (!visitor) return res.status(200).json({ exists: false, masked: null });

      const firstName = (visitor.name.split(' ')[0] || '').slice(0, 1);
      return res.status(200).json({
        exists: true,
        masked: firstName ? `${firstName}***` : null,
      });
    } catch (error) {
      console.error('[CheckinController.verify] error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async ingestCameraData(req: Request, res: Response) {
    const { type, exhibitionId, timestamp, secret, count } = req.body;

    if (!env.CAMERA_SECRET) {
      return res.status(503).json({ error: 'Camera ingest not configured' });
    }
    if (secret !== env.CAMERA_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (type !== 'ENTRADA' && type !== 'SAIDA') {
      return res.status(400).json({ error: "type must be 'ENTRADA' or 'SAIDA'" });
    }

    try {
      const camera =
        (await prisma.camera.findFirst({ where: { active: true } })) ||
        (await prisma.camera.findFirst());

      if (!camera) {
        return res.status(404).json({ error: 'No camera registered in system' });
      }

      const created = await prisma.cameraCount.create({
        data: {
          cameraId: camera.id,
          exhibitionId,
          type,
          count: typeof count === 'number' && count > 0 ? Math.floor(count) : 1,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
        },
      });

      invalidateDashboardCache();
      getIO().emit('occupancy_update', {
        type: 'camera_count',
        countType: created.type,
        exhibitionId,
        timestamp: created.timestamp,
      });

      return res.status(201).json({ success: true, id: created.id });
    } catch (error) {
      console.error('[CheckinController.ingestCameraData] error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Stats per exhibition. Sums batch `count`s instead of counting rows (LOG-01).
   * Window: today only — historical totals don't represent "current occupancy".
   */
  async getStats(req: Request, res: Response) {
    const { exhibitionId } = req.params;
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    try {
      const totalCheckins = await prisma.checkin.count({ where: { exhibitionId } });

      const entriesAgg = await prisma.cameraCount.aggregate({
        _sum: { count: true },
        where: { type: 'ENTRADA', exhibitionId, timestamp: { gte: start } },
      });
      const exitsAgg = await prisma.cameraCount.aggregate({
        _sum: { count: true },
        where: { type: 'SAIDA', exhibitionId, timestamp: { gte: start } },
      });

      const entries = entriesAgg._sum.count ?? 0;
      const exits = exitsAgg._sum.count ?? 0;
      const occupancy = Math.max(0, entries - exits);

      return res.json({
        totalCheckins,
        currentOccupancy: occupancy,
        entries,
        exits,
      });
    } catch (error) {
      console.error('[CheckinController.getStats] error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async simulateCount(req: Request, res: Response) {
    const { type, exhibitionId, count } = req.body;
    if (type !== 'ENTRADA' && type !== 'SAIDA') {
      return res.status(400).json({ error: "type must be 'ENTRADA' or 'SAIDA'" });
    }

    try {
      const camera = await prisma.camera.findFirst();
      if (!camera) return res.status(404).json({ error: 'No camera found' });

      const created = await prisma.cameraCount.create({
        data: {
          cameraId: camera.id,
          exhibitionId,
          type,
          count: typeof count === 'number' && count > 0 ? Math.floor(count) : 1,
        },
      });

      invalidateDashboardCache();
      getIO().emit('occupancy_update', {
        type: 'camera_count',
        countType: type,
        exhibitionId,
        timestamp: new Date(),
      });

      return res.status(201).json(created);
    } catch (error) {
      console.error('[CheckinController.simulateCount] error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
