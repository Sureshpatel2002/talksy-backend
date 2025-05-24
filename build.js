const fs = require('fs');
const path = require('path');

try {
    // Ensure we're in the correct directory
    const projectRoot = process.cwd();
    
    // Read the example config
    const exampleConfig = fs.readFileSync(path.join(projectRoot, 'config.example.js'), 'utf8');
    
    // Write the config file
    fs.writeFileSync(path.join(projectRoot, 'config.js'), exampleConfig);
    
    console.log('✅ Created config.js from config.example.js');
} catch (error) {
    console.error('❌ Error creating config.js:', error.message);
    process.exit(1);
} 