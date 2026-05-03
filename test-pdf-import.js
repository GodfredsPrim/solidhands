async function test() {
    const pdf = await import('pdf-parse');
    console.log('PDF module:', pdf);
    console.log('Keys:', Object.keys(pdf));
    console.log('default:', pdf.default);
}

test();
