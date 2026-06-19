const fs = require('fs');
const path = require('path');

function build() {
    console.log('Starting single HTML bundle compilation...');

    try {
        const srcDir = path.join(__dirname, 'src');
        const distFile = path.join(__dirname, 'index.html');

        // Read source files
        let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
        const css = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
        const synth = fs.readFileSync(path.join(srcDir, 'asset_synth.js'), 'utf8');
        const game = fs.readFileSync(path.join(srcDir, 'game.js'), 'utf8');

        // Inline CSS
        const cssLinkTag = '<link rel="stylesheet" href="style.css">';
        if (html.includes(cssLinkTag)) {
            html = html.replace(cssLinkTag, `<style>\n${css}\n</style>`);
            console.log('✔ Inlined style.css successfully.');
        } else {
            console.warn('⚠️ CSS link tag not found in index.html');
        }

        // Inline Synth Script
        const synthScriptTag = '<script src="asset_synth.js"></script>';
        if (html.includes(synthScriptTag)) {
            html = html.replace(synthScriptTag, `<script>\n${synth}\n</script>`);
            console.log('✔ Inlined asset_synth.js successfully.');
        } else {
            console.warn('⚠️ asset_synth.js script tag not found in index.html');
        }

        // Inline Game Script
        const gameScriptTag = '<script src="game.js"></script>';
        if (html.includes(gameScriptTag)) {
            html = html.replace(gameScriptTag, `<script>\n${game}\n</script>`);
            console.log('✔ Inlined game.js successfully.');
        } else {
            console.warn('⚠️ game.js script tag not found in index.html');
        }

        // Write output
        fs.writeFileSync(distFile, html, 'utf8');
        console.log(`\n🎉 Success! Single HTML file compiled to: ${distFile}`);
        console.log(`Bundle size: ${(Buffer.byteLength(html) / 1024).toFixed(2)} KB\n`);

    } catch (error) {
        console.error('❌ Build failed with error:', error);
        process.exit(1);
    }
}

build();
