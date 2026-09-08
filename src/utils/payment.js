// Payload EMV do "PIX Copia e Cola" (BR Code) — gera o QR Code no frontend, sem API externa.

const sanitize = (v) => (v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 .\-/@_+]/g, '').trim().toUpperCase();

const field = (id, value) => {
  const v = String(value ?? '');
  return id + String(v.length).padStart(2, '0') + v;
};

const crc16 = (str) => {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

export function buildPixPayload({ key, name, city, amount, txid = 'MARI-LASH' }) {
  const merchantAccount =
    field('00', 'br.gov.bcb.pix') +
    field('01', sanitize(key).replace(/\s/g, ''));
  const payload =
    field('00', '01') +
    field('26', merchantAccount) +
    field('52', '0000') +
    field('53', '986') +
    (amount ? field('54', Number(amount).toFixed(2)) : '') +
    field('58', 'BR') +
    field('59', sanitize(name).slice(0, 25)) +
    field('60', sanitize(city).slice(0, 15)) +
    field('62', field('05', sanitize(txid).replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***')) +
    '6304';
  return payload + crc16(payload);
}

export const WHATSAPP_COMMERCIAL = '5514998792169';

export function buildBookingMessage({
  service, date, time, name, whatsapp, notes, paymentLabel, amount,
  promotion = null, participants = null, couponCode = null, totalDiscount = null, originalAmount = null,
}) {
  const brl = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
  const lines = [
    '✨ *Mari Lash Designer* — Novo agendamento ✨',
    '',
  ];
  if (promotion) {
    lines.push(`🎉 *Promoção:* ${promotion}`);
    if (participants?.length) lines.push(`👥 *Participantes:* ${participants.join(', ')}`);
  }
  lines.push(
    `💜 *Serviço:* ${service}`,
    `📅 *Data:* ${date}`,
    `⏰ *Horário:* ${time}`,
  );
  if (totalDiscount != null && Number(totalDiscount) > 0 && originalAmount != null) {
    lines.push(`💰 *Valor:* ~~${brl(originalAmount)}~~ *${brl(amount)}* (−${brl(totalDiscount)})`);
    if (couponCode) lines.push(`🎟️ *Cupom:* ${couponCode}`);
  } else {
    lines.push(`💰 *Valor:* ${brl(amount)}`);
  }
  lines.push(
    `💳 *Forma de pagamento:* ${paymentLabel}`,
    '',
    `👩 *Nome:* ${name}`,
    `📱 *WhatsApp:* ${whatsapp}`,
  );
  if (notes) lines.push(`📝 *Observações:* ${notes}`);
  lines.push('', 'Aguardo a confirmação! 💜');
  return lines.join('\n');
}

export function openWhatsApp(message, number = '5514998792169') {
  const url = `https://wa.me/${(number || '').replace(/\D/g, '') || '5514998792169'}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
