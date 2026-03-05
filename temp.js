const fs = require('fs');  
const path = require('path');  
const filePath = path.join(__dirname, 'my-app', 'src', 'app', '(dashboard)', 'notifications', 'page.tsx');  
let content = fs.readFileSync(filePath, 'utf8');  
content = content.replace('Info,', "Info,\n  RefreshCw,");  
fs.writeFileSync(filePath, content);  
