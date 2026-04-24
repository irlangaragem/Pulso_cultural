# Antigravity Handoff Report: Pulso Cultural Dashboard

**Contexto:** O projeto é um dashboard em React (Vite) de métricas culturais. Este documento detalha as últimas implementações realizadas, para servir de contexto caso outro assistente (Antigravity) precise assumir o projeto.

---

## 1. Dependências Adicionadas
Foram instaladas as seguintes bibliotecas no projeto via `npm install`:
- `html2canvas` (para capturar o componente React em imagem PNG)
- `qrcode.react` (para renderizar o QR Code dinâmico no cartaz)

## 2. Modificações no `src/App.jsx`
O arquivo `App.jsx` concentra todo o dashboard. As seguintes mudanças estruturais e lógicas foram feitas:

### 2.1 Imports Adicionados
```javascript
import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
```

### 2.2 Controle de Estado (Aba "Exposição")
Foram criados novos estados no componente `TabExposition` para suportar o upload de imagens e o modal do cartaz:
- `expo`: Adicionada a chave `capaImagem: null`.
- `obras`: Adicionada a chave `imagem: null` para cada objeto de obra.
- `showPoster`: Estado booleano (`useState(false)`) para controlar a visibilidade do modal do cartaz.
- `posterRef`: Uma referência (`useRef(null)`) ligada à `div` do cartaz para permitir a captura de imagem.

### 2.3 Lógica de Upload de Imagem (`handleImageUpload`)
Foi implementada uma função de validação e conversão de arquivo local:
```javascript
const handleImageUpload = (file, callback) => {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert("A imagem não pode ter mais de 5MB.");
    return;
  }
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    alert("Apenas formatos PNG e JPG são permitidos.");
    return;
  }
  const imageUrl = URL.createObjectURL(file);
  callback(imageUrl);
};
```
* **Uso na Capa:** O bloco de *upload* da capa (`label` envolvendo `input type="file"`) aciona esta função e, em caso de sucesso, atualiza `expo.capaImagem` e exibe o preview usando a tag `<img>`.
* **Uso nas Obras:** O botão "Enviar imagem" da edição de obras faz o mesmo, mas atualiza o array de `obras` no índice correspondente.

### 2.4 Modal do Cartaz e Captura de PNG
O botão "Salvar e publicar guia" teve seu `onClick` alterado para abrir o modal (`setShowPoster(true)`). 
O modal contém:
- Um layout visual usando os dados da exposição (Nome, obras, etc.).
- O componente `<QRCodeCanvas>` gerando um link dinâmico: `` `https://pulso.cultural/guia/${expo.nome.replace(/\s+/g, '-').toLowerCase()}` ``.
- Um botão de download que utiliza `html2canvas`:
```javascript
onClick={async () => {
  if (posterRef.current) {
    const canvas = await html2canvas(posterRef.current, { scale: 2, backgroundColor: "#1A1118" });
    const link = document.createElement("a");
    link.download = "cartaz-pulso-cultural.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }
}}
```

### 2.5 Relatório de Impacto em PDF
Na `TabReport`, o botão de "Exportar relatório em PDF" foi ajustado de um simples `alert` para uma chamada nativa do navegador:
```javascript
onClick={() => window.print()}
```

Para garantir uma renderização de impressão limpa, foi injetado código CSS global (no `mobileCSS` inserido no final do documento via `document.head.appendChild`):
```css
@media print {
  @page { margin: 0; size: A4; }
  body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  [data-root] { background: white !important; color: black !important; display: block; }
  [data-nav], [data-header], .no-print, button { display: none !important; }
  [data-content] { padding: 20px !important; height: auto !important; overflow: visible !important; }
  div, span, p, h1, h2, h3 { color: black !important; }
  div[style*="background: rgb(30, 25, 36)"] { background: white !important; border: 1px solid #ccc !important; }
  div[style*="background: linear-gradient"] { background: #f9f9f9 !important; border: 1px solid #ccc !important; }
  svg text { fill: black !important; }
}
```

---

## 3. Próximos Passos (Possíveis)
Se você (outro Antigravity) estiver assumindo, você provavelmente lidará com:
1. **Integração Back-end:** Os dados atualmente estão estáticos e o "upload" gera `blob: URLs` (via `URL.createObjectURL`). O próximo passo lógico é trocar isso para chamadas de uma API (ex: `multipart/form-data`) e retornar links de CDN, como S3.
2. **Atualizar o arquivo no diretório raiz do usuário:** O trabalho ocorreu no diretório `/scratch`. O arquivo original em `/Downloads` permanece intocado. Pode ser necessário exportar uma versão limpa caso o usuário deseje substituir.
