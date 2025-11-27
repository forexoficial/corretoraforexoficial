export type DocumentType = "CPF" | "CNPJ";

export const formatDocument = (value: string, type: DocumentType): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (type === "CPF") {
    // Format: 000.000.000-00
    return numbers
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // Format: 00.000.000/0000-00
    return numbers
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
};

export const validateDocument = (doc: string, type: DocumentType): boolean => {
  const numbers = doc.replace(/\D/g, '');
  
  if (type === "CPF") {
    return numbers.length === 11;
  } else {
    return numbers.length === 14;
  }
};

export const cleanDocument = (doc: string): string => {
  return doc.replace(/\D/g, '');
};
