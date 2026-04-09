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
      const cpfHash = await HashService.hashCPF(cpf);

      // Find or create visitor
      let visitor = await prisma.visitor.findUnique({
        where: { cpfHash }
      });

      if (!visitor) {
        visitor = await prisma.visitor.create({
          data: {
            cpfHash,
            name,
            birthYear,
            gender,
            origin
          }
        });
      }

      // Create checkin
      const checkin = await prisma.checkin.create({
        data: {
          visitorId: visitor.id,
          exhibitionId,
          channel
        }
      });

      // Emit event for real-time dashboard
      // Note: In a real app, we'd calculate real-time occupancy
      // For the MVP, we just emit that a checkin happened
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

  async verify(req: Request, res: Response) {
    const { cpf } = req.body;


    try {
      const cpfHash = await HashService.hashCPF(cpf);
      const visitor = await prisma.visitor.findUnique({
        where: { cpfHash }
      });

      if (!visitor) {
        return res.status(404).json({ error: 'Visitor not found' });
      }

      // Privacy: Only return the first name and minimal info
      const firstName = visitor.name.split(' ')[0];

      return res.status(200).json({
        success: true,
        firstName,
        name: visitor.name, // Keep for now as frontend uses it, but in a real prod we'd tokenise
        birthYear: visitor.birthYear,
        gender: visitor.gender,
        origin: visitor.origin
      });
    } catch (error) {
      console.error('Verify error:', error);
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
