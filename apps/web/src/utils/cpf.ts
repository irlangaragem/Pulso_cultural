export const formatCPF = (value: string): string => {
  let cleaned = value.replace(/\D/g, '');
  if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
  
  cleaned = cleaned.replace(/(\d{3})(\d)/, '$1.$2');
  cleaned = cleaned.replace(/(\d{3})(\d)/, '$1.$2');
  cleaned = cleaned.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  
  return cleaned;
};

export const isValidCPF = (cpf: string): boolean => {
  const rawCpf = cpf.replace(/[^\d]+/g, '');
  if (rawCpf.length !== 11 || /^(\d)\1{10}$/.test(rawCpf)) return false;
  
  let add = 0;
  for (let i = 0; i < 9; i++) add += parseInt(rawCpf.charAt(i)) * (10 - i);
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(rawCpf.charAt(9))) return false;
  
  add = 0;
  for (let i = 0; i < 10; i++) add += parseInt(rawCpf.charAt(i)) * (11 - i);
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(rawCpf.charAt(10))) return false;
  
  return true;
};
