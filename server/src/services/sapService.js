const axios = require('axios');

// Simple in-memory cache: { "base64auth": timestamp }
const authCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const verifySapCredentials = async (username, password) => {
    try {
        const cacheKey = `${username}:${password}`;
        const now = Date.now();
        
        // Check cache first
        if (authCache.has(cacheKey)) {
            const timestamp = authCache.get(cacheKey);
            if (now - timestamp < CACHE_DURATION) {
                return true;
            }
        }

        const sapUrl = process.env.SAP_URL;
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        
        // We use $top=1 to keep the request lightweight just for validation
        await axios.get(sapUrl, {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            params: {
                '$format': 'json',
                '$top': 1,
                '$filter': "(ZivWerks eq '5221')" 
            }
        });

        // Cache the valid credentials
        authCache.set(cacheKey, now);
        return true;
    } catch (error) {
        // If 401 Unauthorized, credentials are wrong
        if (error.response && error.response.status === 401) {
            return false;
        }
        return false;
    }
};

const fetchSapData = async (username = null, password = null) => {
  try {
    const sapUrl = process.env.SAP_URL;
    // Use provided credentials OR fallback to env
    const finalUsername = username || process.env.SAP_USERNAME;
    const finalPassword = password || process.env.SAP_PASSWORD || "Aksa2029.";

    if (!finalUsername || !finalPassword) {
        console.error("Missing SAP credentials for fetch.");
        return [];
    }

    const auth = Buffer.from(`${finalUsername}:${finalPassword}`).toString('base64');
    
    console.log(`Fetching from SAP: ${sapUrl}`);
    const response = await axios.get(sapUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      params: {
        '$format': 'json',
        '$filter': "(ZivWerks eq '5221')"
      }
    });

    if (response.data && response.data.d && response.data.d.results) {
      const results = response.data.d.results;
      console.log(`Fetched ${results.length} keys from SAP.`);

      const listKeys = ['LIST_ATANACAK', 'LIST_ATANACAK_A', 'LIST_ATANACAK_S', 'LIST_ATANACAK_D', 'LIST_ILTLM', 'LIST_CALS', 'LIST_ENRJ', 'LIST_IPTL', 'LIST_TAML', 'LIST_KBLBEK', 'LIST_ATANACAK_OMS', 'LIST_YOL', 'LIST_ADRS', 'LIST_KBL', 'LIST_RED', 'LIST_TDOB', 'LIST_ADRBUK', 'LIST_BEKL', 'LIST_ONKB'];
      const worksMap = new Map();

      for (const item of results) {
        if (listKeys.includes(item.Zkey) && item.Zvalue) {
            try {
                const workList = JSON.parse(item.Zvalue);
                if (Array.isArray(workList) && workList.length > 0) {
                    console.log(`Processing ${item.Zkey} with ${workList.length} items.`);
                    
                    for (const work of workList) {
                         const workId = work.ustIsEmri || work.orderid || work.id;
                         if (workId) {
                             // If duplicate, overwrite or ignore? 
                             // Let's overwrite to get latest info, or keep first found.
                             // Overwriting is safer if order matters less, but if multiple lists, maybe merge listType?
                             // For now, simple dedupe: keep the last one found or first one?
                             // Let's keep the existing one if found to avoid re-rendering issues?
                             // Actually, let's just use a Map to ensure unique ID.
                             if (!worksMap.has(workId)) {
                                 worksMap.set(workId, {
                                    ...work,
                                    sapId: workId,
                                    listType: item.Zkey,
                                    ZivWerks: String(work.werks || work.ZivWerks || ''), 
                                    fetchedAt: new Date()
                                 });
                             } else {
                                 // Optional: Update listType to show multiple? 
                                 // e.g. worksMap.get(workId).listTypes.push(item.Zkey);
                             }
                         }
                    }
                } else {
                    console.log(`Key ${item.Zkey} has empty or invalid list.`);
                }
            } catch (parseError) {
                console.error(`Error parsing JSON for key ${item.Zkey}:`, parseError.message);
            }
        }
      }
      const allWorks = Array.from(worksMap.values());
      console.log(`SAP fetch complete. Found ${allWorks.length} unique items.`);
      return allWorks;

    } else {
      console.log('No data found in SAP response or unexpected format.');
      return [];
    }
  } catch (error) {
    console.error('Error fetching SAP data:', error.message);
    if (error.response) {
      console.error('SAP Response Status:', error.response.status);
    }
    throw error;
  }
};

module.exports = { fetchSapData, verifySapCredentials };
