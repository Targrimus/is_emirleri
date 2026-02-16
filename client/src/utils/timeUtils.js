// Utility function to calculate remaining time
const calculateRemainingTime = (dateStr, timeStr) => {
  if (!dateStr || dateStr === '0000-00-00') return null;
  
  const targetDate = new Date(`${dateStr}T${timeStr || '00:00:00'}`);
  const now = new Date();
  const diff = targetDate - now;

  if (diff < 0) return { text: 'Expired', variant: 'danger' };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  let text = '';
  if (days > 0) text += `${days}d `;
  text += `${hours}h left`;
  
  return { 
    text, 
    variant: days === 0 && hours < 24 ? 'danger' : 'success' 
  };
};
