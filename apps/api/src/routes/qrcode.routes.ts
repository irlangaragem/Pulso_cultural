import { Router } from 'express';
import { QRCodeController } from '../controllers/QRCodeController';
import rateLimit from 'express-rate-limit';

const generateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de geração de QR atingido. Tente novamente em 1 hora.' },
  keyGenerator: (req) => {
    const user = (req as any).user;
    return user?.id ?? req.ip ?? 'unknown';
  },
});

const qrcodeRoutes = Router();

// Todas as rotas abaixo já passaram pelo authMiddleware (registrado em index.ts)
qrcodeRoutes.post('/generate', generateLimit, QRCodeController.generate);
qrcodeRoutes.get('/active',                  QRCodeController.getActive);
qrcodeRoutes.get('/history',                 QRCodeController.getHistory);
qrcodeRoutes.get('/:id/token',               QRCodeController.getDownloadToken);
qrcodeRoutes.patch('/:id/revoke',            QRCodeController.revoke);
qrcodeRoutes.patch('/:id/reactivate',        QRCodeController.reactivate);

// Imagem PNG — semi-pública (requer token efêmero na query string)
// Registrada FORA do authMiddleware em index.ts
qrcodeRoutes.get('/:id/image.png',           QRCodeController.getImage);

export { qrcodeRoutes };
