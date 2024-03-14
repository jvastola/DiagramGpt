
import * as pako from 'pako'

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
})

function compress(input) {
  // Convert the input string to a Uint8Array
  //input = input.text;
  const textEncoder = new TextEncoder();
  const inputUint8Array = textEncoder.encode(input);

  // Compress the Uint8Array using pako's deflate function
  const compressedUint8Array = pako.deflate(inputUint8Array);

  // Encode the compressed Uint8Array to a Base64 string
  const base64Encoded = btoa(
    String.fromCharCode.apply(null, compressedUint8Array)
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return base64Encoded;
}
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.slice(1);

  if (request.method === "POST") {
    // Retrieve the raw diagram data
    const body = await request.json();
    const rawData= body.diagram;

    // Encode the data into ASCII and then Base64
    const encodedData = compress(rawData);

    // Generate a key for the diagram
    const diagramKey = generateKey();

    // Store the Base64 encoded diagram
    await kvspace.put(diagramKey, encodedData);

    // Return the key
    return new Response(JSON.stringify({ key: "https://view.diagram.workers.dev/"+diagramKey, edit: "https://view.diagram.workers.dev/edit/"+diagramKey }), { status: 200, headers: { "Content-Type": "application/json" } });

  }  else if (path.startsWith("edit/") && request.method === "GET") {
    // Extract the diagram key from the URL
    const diagramKey = path.slice(5);

    // Fetch the encoded diagram data from kvspace
    const encodedDiagram = await kvspace.get(diagramKey);

    if (encodedDiagram) {
      // Construct the mermaid.live edit URL with the encoded diagram
      const editUrl = `https://niolesk.top/#https://kroki.io/mermaid/svg/${encodedDiagram}`;

      // Redirect to the mermaid.live edit URL
      return Response.redirect(editUrl, 302);
    } else {
      return new Response("Diagram not found for editing", { status: 404 });
    }
  }else if (request.method === "GET") {
    const encodedDiagram = await kvspace.get(path);
    if (encodedDiagram) {
      const svgUrl = `https://kroki.io/mermaid/svg/${encodedDiagram}`;
      const svgResponse = await fetch(svgUrl);
      let svgContent = await svgResponse.text();

      // Modify the SVG content to include a white background
      svgContent = svgContent.replace(/<svg([^>]+)>/, '<svg$1><rect width="100%" height="100%" fill="white"/>');

      return new Response(svgContent, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml"
        }
      });
    } else {
      return new Response("Diagram not found", { status: 404 });
    }
  }else {
    return new Response("Method not allowed", { status: 405 });
  }
}

function generateKey() {
  // Simple unique key generation
  return  Math.random().toString(36).substr(2, 9);
}

