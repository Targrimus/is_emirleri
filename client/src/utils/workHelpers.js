export const calculateRemainingTime = (dateStr, timeStr) => {
  if (!dateStr || dateStr === '0000-00-00') return null;
  
  // Try to parse YYYY-MM-DD or DD.MM.YYYY
  let targetDate;
  if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
          const [day, month, year] = parts;
           targetDate = new Date(`${year}-${month}-${day}T${timeStr || '00:00:00'}`);
      } else {
          return null; // Invalid format
      }
  } else {
       targetDate = new Date(`${dateStr}T${timeStr || '00:00:00'}`);
  }

  if (isNaN(targetDate.getTime())) return null;

  const now = new Date();
  const diff = targetDate - now;

  if (diff < 0) return { text: 'Süresi Doldu', variant: 'secondary', expired: true };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  let text = '';
  if (days > 0) text += `${days}g `;
  text += `${hours}s kaldı`;
  
  return { 
    text, 
    variant: days === 0 && hours < 24 ? 'danger' : 'success',
    expired: false
  };
};

export const extractCoordinates = (sortfield) => {
    if (!sortfield) return null;
    
    // Pattern: LAT-LNG (e.g. 40.14600308-26.41183608)
    const cleanStr = sortfield.trim();
    // Support various formats: "LAT-LNG", "LAT LN", "LAT, LNG"
    const match = cleanStr.match(/^(\d+\.\d+)[-,\s]+(\d+\.\d+)$/);
    
    if (match) {
        return {
            lat: parseFloat(match[1]),
            lng: parseFloat(match[2])
        };
    }
    return null;
};

export const getSapWebGuiUrl = (notifNo) => {
    const formattedNotifNo = notifNo.toString().trim().padStart(12, '0');
    return `https://mobilsahaprod.aksa.com.tr:44300/sap/bc/gui/sap/its/webgui/?~transaction=iw23%20RIWO00-QMNUM%3d${formattedNotifNo}&~OKCODE=ENTR&sap-client=100&sap-language=TR#`;
};
