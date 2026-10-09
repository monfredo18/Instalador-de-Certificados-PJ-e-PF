export function formatDocument(document: string): string {
  const cleanDoc = document.replace(/\D/g, '');
  if (cleanDoc.length === 11) {
    return cleanDoc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  } else if (cleanDoc.length === 14) {
    return cleanDoc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return document;
}
