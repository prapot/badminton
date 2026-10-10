const fs = require('fs');

const files = [
    'src/features/tournaments/detail-components/EndlessModeManager.tsx',
    'src/features/tournaments/detail-components/MatchSchedule.tsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace theme colors
    content = content.replace(/indigo-950/g, 'zinc-950');
    content = content.replace(/slate-900/g, 'black');
    content = content.replace(/indigo-([0-9]+)/g, 'lime-$1');
    content = content.replace(/purple-([0-9]+)/g, 'green-$1');
    content = content.replace(/rose-([0-9]+)/g, 'fuchsia-$1');
    content = content.replace(/amber-([0-9]+)/g, 'cyan-$1');
    content = content.replace(/orange-([0-9]+)/g, 'blue-$1');
    
    // Replace emojis to match the vibe
    // 🛡️ (team) -> ⚡
    // 🎲 (auto) -> 🎯
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
});
