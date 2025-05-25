import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    // Get absolute paths
    const projectRoot = process.cwd();
    const exampleConfigPath = path.join(projectRoot, 'config.example.js');
    const configPath = path.join(projectRoot, 'config.js');

    console.log('📁 Project root:', projectRoot);
    console.log('📄 Example config path:', exampleConfigPath);
    console.log('📄 Target config path:', configPath);

    // Check if example config exists
    if (!fs.existsSync(exampleConfigPath)) {
        throw new Error(`Example config file not found at ${exampleConfigPath}`);
    }

    // Read the example config
    const exampleConfig = fs.readFileSync(exampleConfigPath, 'utf8');
    console.log('✅ Read example config file');

    // Write the config file
    fs.writeFileSync(configPath, exampleConfig);
    console.log('✅ Created config.js from config.example.js');

    // Verify the file was created
    if (fs.existsSync(configPath)) {
        console.log('✅ Verified config.js exists');
    } else {
        throw new Error('Config file was not created successfully');
    }
} catch (error) {
    console.error('❌ Error creating config.js:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
} 