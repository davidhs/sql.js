import initSqlJs from "../dist/sql-wasm-debug.js";


////////////////////////////////////////////////////////////////////////////////


const observer = {
  stream_node_buffer_key: null,
};

// "Prelude"
observer.writeHookStart = function (stream, buffer, offset, length, position, canOwn) {
  // Search for Buffer key
  const keys = Object.keys(stream.node);

  for (const key of keys.values()) {
    const value = stream.node[key];

    if (value instanceof Uint8Array) {
      observer.stream_node_buffer_key = key;

      // Rebind
      observer.writeHook = observer.writeHookReady;
      break;
    }
  }
};

observer.writeHookReady = function (stream, buffer, offset, length, position, canOwn) {
  console.info("Write hook:", { stream, buffer, offset, length, position, canOwn });

  const change = stream.node[observer.stream_node_buffer_key];

  console.info("Change:", change);

  let msg = [];

  msg.push(`Path: ${stream.path}\n`);
  msg.push(`  Offset: ${offset}\n`);
  msg.push(`  Length: ${length}\n`);
  msg.push(`  Change: ${toBinString(change)}\n`);


  console.info(msg.join(""));
};

observer.writeHook = observer.writeHookStart;


function modifyModule(module) {
  const _original_write = module.FS.write;

  module.FS.write = function (stream, buffer, offset, length, position, canOwn) {
    observer.writeHook(stream, buffer, offset, length, position, canOwn);

    return _original_write(stream, buffer, offset, length, position, canOwn);
  };
}

////////////////////////////////////////////////////////////////////////////////


var baseUrl = '../dist/';

function toBinArray(str) {
  var l = str.length,
    arr = new Uint8Array(l);
  for (var i = 0; i < l; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

function toBinString(arr) {
  var uarr = new Uint8Array(arr);
  var strings = [], chunksize = 0xffff;
  // There is a maximum stack size. We cannot call String.fromCharCode with as many arguments as we want
  for (var i = 0; i * chunksize < uarr.length; i++) {
    strings.push(String.fromCharCode.apply(null, uarr.subarray(i * chunksize, (i + 1) * chunksize)));
  }
  return strings.join('');
}

// Normally Sql.js tries to load sql-wasm.wasm relative to the page, not relative to the javascript
// doing the loading. So, we help it find the .wasm file with this function.
const config = {
  locateFile: filename => `${baseUrl}/${filename}`
};


async function main() {
  const SQL = await initSqlJs(config);

  window.SQL = SQL;

  modifyModule(SQL);

  const database_name = "viewcount.sqlite";

  var database_string = window.localStorage.getItem(database_name);

  let db;

  


  if (database_string) {
    db = new SQL.Database(toBinArray(database_string), database_name);
  } else {
    db = new SQL.Database(undefined, database_name);
    db.run("CREATE TABLE views (date INTEGER PRIMARY KEY)");
  }
  db.run("INSERT INTO views(date) VALUES (?)", [Date.now()]);

  document.getElementById('views').textContent = db.exec("SELECT COUNT(*) FROM views")[0].values[0][0];

  const dates = document.getElementById("dates");

  db.each("SELECT date FROM views ORDER BY date ASC",
    function callback(row) {
      var li = document.createElement("li");
      li.textContent = new Date(row.date);
      dates.appendChild(li);
    }, function done() {
      var dbstr = toBinString(db.export());
      window.localStorage.setItem(database_name, database_string);
    }
  );
}

main();
