function findAllTextNodes(object: any, text_nodes: any[]) {
  if (object.type === "TEXT") {
    text_nodes.push({
      id: object.id,
      name_text_node: object.name,
      characters: object.characters,
    });
  } else if (object.children && object.children.length !== 0) {
    for (let i = 0; i < object.children.length; i++) {
      const element = object.children[i];
      findAllTextNodes(element, text_nodes);
    }
  }
}

let frame_main_clone: any = null;

function run_plugin(): void {
  // TODO: La extensión envia los  datos del frame a la UI (si es que existe un solo FRAME seleccionado).
  const selected_elements = figma.currentPage.selection;

  // TODO: Verificar que solo un elemento (nodo) este seleccionado y que sea de tipo FRAME
  if (selected_elements.length === 1 && selected_elements[0].type === "FRAME") {
    const frame_found = selected_elements[0];
    frame_main_clone = frame_found.clone(); // clonning

    console.log("Frame element:", frame_main_clone);

    // TODO: Enviar a la UI el id y nombre de los nodos de tipo TextNode (ya sean hijos de hijos de hijos etc ..)
    let text_nodes: any[] = [];
    // se enviara siempre por defecto este campo para poder definir el nombre de los Frames
    text_nodes.push({
      id: "frame:name",
      name_text_node: "Frame name",
      characters: frame_main_clone.name,
    });
    findAllTextNodes(frame_main_clone, text_nodes);
    //text_nodes = frame_main_clone.findAll((node: any) => node.type === "TEXT"); // works, but only return the id

    figma.showUI(__html__);
    figma.ui.resize(600, 500);
    figma.ui.postMessage({ text_nodes });
  } else {
    figma.closePlugin("First, you need to select just one Frame");
  }
}

run_plugin();

figma.ui.onmessage = async (message) => {
  if (message.action === "generate") {
    await generate_copies(message);
    figma.closePlugin("Done!");
  } else if (message.action === "close") {
    if (!frame_main_clone.removed) {
      // Eliminar el frame_main_clone
      frame_main_clone.remove();
    }
    figma.closePlugin("Plugin closed");
  }

  figma.closePlugin();
};

figma.on("close", () => {
  if (!frame_main_clone.removed) {
    // Eliminar el frame_main_clone
    frame_main_clone.remove();
  }
});

async function generate_copies(data: any): Promise<void> {
  const { num_copies, keep_copies, change_one_data, change_many_data } = data;

  /*
  console.log("-> num_copies: ", num_copies);
  console.log("-> keep_copies: ", keep_copies);
  console.log("-> change_one_data:", change_one_data);
  console.log("-> change_many_data:", change_many_data);*/

  // TODO: 1. Verificar que el frame seleccionado no se haya eliminado
  if (!frame_main_clone.removed) {
    const new_page = figma.createPage();
    new_page.appendChild(frame_main_clone);

    await figma.loadFontAsync({ family: "Inter", style: "Regular" });

    // TODO: 2. Establecer los valores del arreglo change_one_data en el Frame clonado
    for (let key of Object.keys(change_one_data)) {
      console.log(key + " -> " + change_one_data[key]);
      let correct_key = key.replace("_", ":");

      if (correct_key === "frame:name") {
        frame_main_clone.name = String(change_one_data[key]);
      } else {
        const text_node_found = frame_main_clone.findOne(
          (node: any) => node.id === correct_key
        );
        text_node_found.characters = String(change_one_data[key]);
      }
    }

    const width = frame_main_clone.width;

    // TODO: 3. Establecer los valores en el frame 2 y luego duplicar hasta completar las n copias
    const frame_clones: any = [];

    for (let i = 0; i < num_copies; i++) {
      for (let key of Object.keys(change_many_data)) {
        console.log(key + " ---> " + change_many_data[key]);
        let correct_key = key.replace("_", ":");

        if (correct_key === "frame:name") {
          frame_main_clone.name = String(change_many_data[key][i]);
        } else {
          const text_node_found = frame_main_clone.findOne(
            (node: any) => node.id === correct_key
          );
          text_node_found.characters = String(change_many_data[key][i]);
        }
      }

      let new_frame_clone = frame_main_clone.clone(); // cloning

      console.log("width:", width, new_frame_clone.x + width * (i + 0.3));

      new_frame_clone.x += (width + width / 5) * i; // se agrega un espacio entre frames que es la quinta parte del ancho

      new_page.appendChild(new_frame_clone);
      frame_clones.push(new_frame_clone);
    }

    // TODO: 4. Eliminar el frame_main_clone
    frame_main_clone.remove();

    // TODO: 5. Cambiar a la pagina donde se generaron las copias
    figma.currentPage = new_page;

    // TODO: 6. Seleccionar todos los frames generados y enfocarlos
    new_page.selection = frame_clones;
    figma.viewport.scrollAndZoomIntoView(new_page.selection);
  }
}
