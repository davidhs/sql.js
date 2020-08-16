import initSqlJs from "../dist/sql-wasm.js";

//Open a blank database
var db;
initSqlJs({ locateFile: filename => `../dist/${filename}` }).then(function (SQL) {
  db = new SQL.Database();
});

document.getElementById('submit').onclick = function () {
  var sql = document.getElementById('input').value;
  var result = '', error = '';
  try { result = db.exec(sql); }
  catch (e) { error = e; }
  document.getElementById('result').innerHTML = JSON.stringify(result, null, '  ');
  document.getElementById('error').innerHTML = error;
};