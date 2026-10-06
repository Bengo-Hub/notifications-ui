// Messages stored before the API labelled media (e.g. "[unsupported message type: image]") read
// the same way new ones do ("Photo").
const LEGACY_MEDIA: Record<string, string> = {
  image: 'Photo',
  video: 'Video',
  audio: 'Voice note',
  voice: 'Voice note',
  document: 'Document',
  sticker: 'Sticker',
  location: 'Location',
  contacts: 'Contact card',
  reaction: 'Reaction',
};

export function messageText(text?: string | null, empty = 'No messages yet'): string {
  if (!text) return empty;
  const m = text.match(/^\[unsupported message type: (\w+)\]$/);
  if (m) return LEGACY_MEDIA[m[1].toLowerCase()] ?? 'Message (open WhatsApp to view)';
  return text;
}
