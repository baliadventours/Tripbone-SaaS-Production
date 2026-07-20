const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function main() {
  const rootPath = process.cwd();
  const configPath = path.resolve(rootPath, "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    console.log("No config file found");
    return;
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  
  const projectId = config.projectId;
  const databaseId = config.firestoreDatabaseId;
  const apiKey = config.apiKey;

  const resolvedCustomDomain = "smartbalitours.com";
  const cleanDomain = resolvedCustomDomain.replace(/^www\./i, '');
  const domainsToSearch = [cleanDomain, 'www.' + cleanDomain];

  console.log("Domains to search:", domainsToSearch);

  const structuredQuery = {
    from: [{ collectionId: "tenants" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "customDomain" },
        op: "IN",
        value: {
          arrayValue: {
            values: domainsToSearch.map(v => ({ stringValue: v }))
          }
        }
      }
    }
  };

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;
  
  const headers = {
    'Referer': 'https://gorilla-atv-adventure.firebaseapp.com/',
    'Origin': 'https://gorilla-atv-adventure.firebaseapp.com'
  };

  try {
    const res = await axios.post(url, { structuredQuery }, { headers });
    console.log("Response data:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("REST IN query error:", err.response?.data || err.message);
  }
}

main();
