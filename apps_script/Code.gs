// CLOUD STOCK - API CRUD PARA GOOGLE SHEETS
// Hoja esperada: Productos
// Columnas: id | nombre | precio | stock

const NOMBRE_HOJA = "Productos";

function hoja() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HOJA);
}

function salida(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// READ
function doGet(e) {
  try {
    const sh = hoja();
    const values = sh.getDataRange().getValues();
    const productos = values.slice(1)
      .filter(r => r[0] !== "")
      .map(r => ({
        id: String(r[0]),
        nombre: r[1],
        precio: Number(r[2]),
        stock: Number(r[3])
      }));

    return salida({ ok: true, productos: productos });
  } catch (error) {
    return salida({ ok: false, error: error.message });
  }
}

// CREATE / UPDATE / DELETE
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    const sh = hoja();

    if (datos.action === "create") {
      const id = String(Date.now());
      sh.appendRow([id, datos.nombre, Number(datos.precio), Number(datos.stock)]);
      return salida({ ok: true, id: id });
    }

    const values = sh.getDataRange().getValues();
    const indice = values.findIndex((r, i) => i > 0 && String(r[0]) === String(datos.id));

    if (indice === -1) {
      return salida({ ok: false, error: "Producto no encontrado" });
    }

    // En Sheets la fila real es índice + 1.
    const fila = indice + 1;

    if (datos.action === "update") {
      sh.getRange(fila, 2).setValue(datos.nombre);
      sh.getRange(fila, 3).setValue(Number(datos.precio));
      sh.getRange(fila, 4).setValue(Number(datos.stock));
      return salida({ ok: true });
    }

    if (datos.action === "delete") {
      sh.deleteRow(fila);
      return salida({ ok: true });
    }

    return salida({ ok: false, error: "Acción desconocida" });

  } catch (error) {
    return salida({ ok: false, error: error.message });
  }
}
