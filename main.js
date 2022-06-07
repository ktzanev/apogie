"use strict";

// the standard header for exam CSV file
const resultsHeader = ["Num", "NOM", "PRENOM", "Note"];


// the possible states of the new lines
const state= Object.freeze({
  Header: 0, // the header line
  Ready: 1, // line with ok first 3 columns and score in the 4th
  NameError: 2, // line with wrong name(s) (2nd and 3d column)
  NumError: 3, // line with a wrong num (1st column)
  Unchanged: 4, // line with ok first 3 columns and no score in the 4th
});


var app = new Vue({
  el: '#app',
  data         : {
    // import Model data
    filenameModel     : '',
    txtModel          : '',
    logModel          : [],
    splitModelAt      : 0,  // index where the table starts in the txtModel
    header_txt        : '', // the par of txtModel before the table data
    info              : null, // the info data about the module
    table_txt         : '', // the table text data extracted from the txtModel
    tableModel        : [], // the table data (2 dimensional array) extracted from table_txt
    tableExport       : [], // 4 column table extracted from the tableModel, with results header and empty scores
    validModel        : false, // true the model is present and valid
    // import CSV data
    filenameCSV       : '',
    txtCSV            : '',
    logCSV            : [],
    tableCSV          : [], // 4 column table extracted from the txtCSV
    approvedCSVname   : false, // true if filename contains the module code or user approved
    ignoreCSVerrors   : false, // allow export even if there are errors in the CSV
    // states of new lines
    state             : state, // all possible states of the csv lines
    // interface variables
    draggModel         : false, // true if the model file is dragged
    draggCSV           : false, // true if the csv file is dragged
    hideTableModel    : true, // hide the model table
    hideFiles         : true, // hide the export csv files
    showReadyCSV      : false, // show the ready csv lines in the table
    showErrorsCSV     : false, // show the errors csv lines in the table
    showUnchangedCSV  : false, // show the unchanged csv lines in the table
  },
  watch: {
    // triged when model is uploaded
    txtModel: function (val) {
      // clear log
      this.logModel.length = 0;
      // set the splitModelAt
      this.splitModelAt = splitModelAt(val);
      if (this.splitModelAt < 0) {
        log(this.logModel,"error","Manque ligne de séparation <code>XX-APO_VALEURS-XX</code>.")
      }
      this.splitModelAt++;
      // set the header_txt
      this.header_txt = val.slice(0, this.splitModelAt);
      // set info object about the model (recovered from the header line apoL_c0001)
      //    it is null if some error occured or the model is empty
      this.info = this.getInfo(this.header_txt);
      // set the table_txt
      if (this.splitModelAt > 0 && this.info) {
        this.table_txt = val.slice(this.splitModelAt);
      } else {
        this.table_txt = '';
      }
      // set the tableModel
      if (this.info) {
        this.tableModel = this.getTableModel(this.table_txt);
      } else {
        this.tableModel = [];
      }
      // set the tableExport
      this.tableExport = this.getTableExport(this.tableModel);
      // set variadModel
      this. validModel = this.txtModel.length > 0 && this.info && this.logModel.filter(l=>l.type == 'error').length == 0;
    },
    // triged when CSV is uploaded
    txtCSV: function (val) {
      this.logCSV = [];
      this.ignoreCSVerrors = false;
      this.tableCSV = this.getTableCSV(val);
    }
  },
  computed: {
    // the filename base used to generate the CSV file names
    filebase: function() {
      if (!this.info) {
        return ''
      }
      return this.info["code"] + " - " + this.info["intitulé"] + " - " + this.info["année"];
    },
    // the CSV files data use to generate the <a> links
    files: function () {
      if (!this.info) {
        return null;
      }
      const base = this.filebase;
      return [
        {"name": base + ".fr.csv", "download": this.downloadFR},
        {"name": base + ".en.csv", "download": this.downloadEN},
        {"name": base + ".txt", "download": this.downloadTXT},
      ]
    },
    // true if no error in the logCSV
    validCSV: function () {
      return this.logCSV.filter(l=>l.type == 'error').length == 0 && this.numErrorsCSV == 0 && this.numReadyCSV > 0;
    },
    // the state (header, ready, nameError, numError, unchanged) of all lines in the tableCSV
    stateLines: function () {
      return stateLines(this.tableExport, this.tableCSV);
    },
    numReadyCSV: function () {
      return this.stateLines.filter(l => l == state.Ready).length;
    },
    numErrorsCSV: function () {
      return this.stateLines.filter(l => l == state.NameError || l == state.NumError).length;
    },
    numUnchangedCSV: function () {
      return this.stateLines.filter(l => l == state.Unchanged).length;
    },
    stageClass: function () {
      var stage = "";
      // stage 1
      if (this.txtModel.length == 0) {
        stage = "waiting1";
      } else if (this.validModel) {
        stage = "done1";
      } else {
        stage = "error1";
      }
      stage += " ";
      // stage 3
      if (this.txtCSV.length == 0) {
        stage += "waiting3";
      } else if (this.approvedCSVname && (this.validCSV || this.ignoreCSVerrors)) {
        stage += "done3";
      } else {
        stage += "error3"
      }
      return stage;
    },
    filenameModelNew: function () {
      var name = this.filenameModel.replace(/\.txt$/i, "") || "Apogee";
      name = name + "-" + this.filebase + ".txt";
      return name;
    }
  },
  methods: {
    // Will be fired by our '@drop.stop.prevent' or on file selection.
    onDropModel(e) {
      var file;
      if ("dataTransfer" in e) {
        file = e.dataTransfer.files[0];
      } else if ("target" in e) {
        file = e.target.files[0];
      }
      // if no file found, do nothing
      if (!file) {
        return;
      }
      app.filenameModel = file.name;
      // create new reader
      var encoding = "ISO-8859-1"
      var reader = new FileReader();
      // when the reader finish to read the file
      reader.onload = function(e) {
        // si l'encodage est bien Windows ou UTF-8
        if (encoding == "ISO-8859-1" && e.target.result.indexOf("Ã©") > 0) {
          encoding = "UTF-8"
          reader.readAsText(file, encoding);
        }
        else {
          app.txtModel = e.target.result;
        }
      };
      // when the reader to read the file
      reader.readAsText(file, encoding);
    },
    // info object about the model (recovered from the header line apoL_c0001)
    // it is null if some error occured or the model is empty
    getInfo(header_txt) {
      // if no table
      if (header_txt.length == 0) {
        return null;
      }
      // apoL_c0001 ...
      var info_module = getLineStartingWith(header_txt, "apoL_c0001");
      if (!info_module) {
        log(app.logModel,"error","Manque la ligne débutant avec <code>apoL_c0001</code>.")
        return null;
      }
      info_module = info_module.split('\t');
      if (info_module.length < 10) {
        log(app.logModel,"error","La ligne qui débute avec <code>apoL_c0001</code> ne contient pas assez de champs.")
        return null;
      }
      // return structured info
      return {
        "code" : info_module[2],
        "année" : info_module[4],
        "intitulé" : info_module[8].replace(info_module[2]+" - ", ""),
      }
    },
    // return the tableModel (2 dimensional array) extracted from the txtModel
    getTableModel(table_txt) {
      var table = tsvToTable(table_txt);
      var n = table.length;
      if (n == 0 || table[0].length < 4) {  // no table or bad header
        log(app.logModel,"error","Pas de tableau à exporter.")
        return [];
      }
      // we keep only valid lines
      table = table.filter(l=>l.length >= 3)
      var removedLines = n - table.length
      if (removedLines > 0) {
        log(app.logModel,"warning",`${removedLines} lignes de la table ne contiennent pas les champs requis (Num, NOM, PRENOM). Elles sont ignorées.`);
      }

      return table
    },
    // 4 column table extracted from the tableModel
    // the header line is replaced with ["Num", "NOM", "PRENOM", "Note"]
    // keep only the lines withous score
    getTableExport: function(tableModel) {
      // remove the header line
      var body = tableModel.slice(1);
      // keep only columns 0,1,2,4 (num, nom, prenom, note)
      body = body.map(l=>l.filter((c,i)=> i<3 || i==4));
      // if some line has no 4th column, add an empty string
      body = body.map(l=>l.length < 4 ? l.concat("") : l);
      // we keep only virgin lines
      var n = body.length;
      body = body.filter(l=> !l[3])
      var removedLines = n - body.length
      if (removedLines > 0) {
        log(app.logModel,"warning",`${removedLines} lignes de la table contiennent déjà une note. Elles sont ignorées.`);
      }
      // something to exoprt ?
      n = body.length;
      if (n  == 0) {
        if (app.table_txt.length > 0) {
          log(app.logModel,"error","Pas de lignes à exporter.")
        }
        return [];
      }

      if (app.table_txt.length > 0) {
        log(app.logModel,"info",`${n} lignes avec note sont à exporter.`);
      }
      return [resultsHeader,...body];
    },
    // Will be fired by our '@drop.stop.prevent' or on file selection.
    onDropCSV(e) {
      var file;
      if ("dataTransfer" in e) {
        file = e.dataTransfer.files[0];
      } else if ("target" in e) {
        file = e.target.files[0];
      }
      // if no file found, do nothing
      if (!file) {
        return;
      }
      app.filenameCSV = file.name;
      // check if the filename contains the module code
      app.approvedCSVname = app.filenameCSV.indexOf(app.info.code) >=0;
      // create new reader
      var encoding = "ISO-8859-1"
      var reader = new FileReader();
      // when the reader finish to read the file
      reader.onload = function(e) {
        // si l'encodage est bien Windows ou UTF-8
        if (encoding == "ISO-8859-1" && e.target.result.indexOf("Ã©") > 0) {
            encoding = "UTF-8"
            reader.readAsText(file, encoding);
          }
          else {
            app.txtCSV = e.target.result;
          }
      };
      // when the reader to read the file
      reader.readAsText(file, encoding);
    },
    // the table from the CSV file
    getTableCSV(txtCSV) {
      // if the text is empty, return an empty table
      if (txtCSV.length == 0) {
        return [];
      }
      // if the text is not a CSV
      var table = CSVToTable(txtCSV);
      if (table.length == 0) {
        // display error message
        log(app.logCSV, 'error', `Le fichier <code>${app.filenameCSV}</code> n'est pas au format CSV.`);
        // and return an empty table
        return [];
      }
      // something to import ?
      if (table.length == 0) {
        // display error message
        log(app.logCSV, 'error', `Le fichier <code>${app.filenameCSV}</code> ne contient pas de lignes avec des notes.`);
        // and return an empty table
        return [];
      }

      // it looks ok, return the table
      return table;
    },
    // when we hit reset button
    resetCSV(e) {
      app.txtCSV = "";
      app.filenameCSV = "";
      app.logCSV = [];
      app.approvedCSVname = false;
      app.ignoreCSVerrors = false;
    },
    // -----------------------------------------------
    // Helper methods for the html
    // -----------------------------------------------
    // the css class for log items
    logClass(type) {
      switch(type){
        case "error":
          return "alert-danger";
        case "warning":
          return "alert-warning";
        default:
          return "alert-info";
      }
    },
    // the state class of a line in the tableCSV
    stateClass(lineState) {
      switch (lineState) {
        case state.Header:
          return 'state-header';
        case state.Ready:
          return app.showReadyCSV ? 'state-ready' : 'state-hidden';
        case state.NameError:
          return app.showErrorsCSV ? 'state-name-error' : 'state-hidden';
        case state.NumError:
          return app.showErrorsCSV ? 'state-num-error' : 'state-hidden';
        case state.Unchanged:
          return app.showUnchangedCSV ? 'state-unchanged' : 'state-hidden';
        default:
          return '';
      }
    },
    // file links for stage 2 (the intermediate download)
    downloadFR(e) {
      const file = tableToFile(app.tableExport, "fr.csv", app.filebase);
      downloadTextFile(file.text, file.name);
    },
    downloadEN(e) {
      const file = tableToFile(app.tableExport, "en.csv", app.filebase);
      downloadTextFile(file.text, file.name);
    },
    downloadTXT(e) {
      const file = tableToFile(app.tableExport, "txt", app.filebase);
      downloadTextFile(file.text, file.name);
    },
    downloadZip(e) {
      var zip = new JSZip();
      // add the files to the zip
      for (let t of ["fr.csv", "en.csv", "txt"]) {
        let file = tableToFile(app.tableExport, t, app.filebase);
        zip.file(file.name, file.text);
      }
      // add LISEZMOI.txt
      zip.file("LISEZMOI.txt", lisezmoi);
      // generate a blob for download and initiate a download
      zip.generateAsync({type:"blob"}).then(function(blob) {
        saveAs(blob, app.filebase + ".zip");
      });
    },
    // the link in stage 4 (the final download)
    DownloadUpdateModel(e) {
      var err = updateNote(app.tableModel, app.tableCSV, app.stateLines);
      if (err) {
        // we should never get here because all ready lines should be ok for updateNote
        log(app.logCSV, "error", err);
        return
      }
      var table_txt = tableToCSV(app.tableModel, '\t', "\r\n");
      downloadTextFile(app.header_txt + table_txt, app.filenameModelNew, "windows")
    },
  },
  created: function () {
    // this.txtModel = modeltxt;
  }
})

// ---------------------------------------------------
// ---------------------------------------------------
// ---------------------------------------------------
// Auxiliary functions
// ---------------------------------------------------
// ---------------------------------------------------
// ---------------------------------------------------

// log adds an error, a warning or info message to the logModel
function log(logArray, type, msg) {
  logArray.push({
    "type": type,
    "msg": msg
  })
}

// the index where starts the table data in the txtModel
function splitModelAt (txtModel) {
  if (txtModel.length == 0) {
    return 0;
  }
  var n = txtModel.indexOf("XX-APO_VALEURS-XX");
  if (n < 0) {
    return n;
  }
  n = txtModel.indexOf("\n", n);
  return n;
}

// return the first line starting with the given pattern
function getLineStartingWith(str, pattern) {
  const n = str.indexOf(pattern)
  if (n < 0) {
    return "";
  }
  return str.slice(n).split(/\r?\n/)[0]
}

// convert a TSV string to a table
function tsvToTable(t) {
  return t
    .trim()
    .split('\n') // split to lines
    .map(
      l => l.split('\t') // split to cells
        .map(c => c.trim()) // trim cells
    )
}

// string replace in the ith column of a table
// used to replace decimal separator
function colReplace(l,i,from,to) {
  l[i] = l[i].replace(from,to);
  return l;
}

// convert two dimensional table to a CSV string
function tableToCSV(t, sep, eol) {
  if (sep === undefined) {
    sep = ',';
  }
  if (eol === undefined) {
    eol = '\n';
  }
  return t.map(l=>l.join(sep)).join(eol)+eol;
}

// return {text, filename} for a text file
function tableToFile(t, type, basename) {
  var file = {} // {text, filename}

  switch (type) {
    case "fr.csv":
      file.text = tableToCSV(app.tableExport.map(l=>colReplace(l,3,'.',',')),';');
      file.name = basename + ".fr.csv";
      break;
    case "en.csv":
      file.text = tableToCSV(app.tableExport.map(l=>colReplace(l,3,',','.')),',');
      file.name = basename + ".en.csv";
      break;
    case "txt":
      file.text = tableToCSV(padTable(app.tableExport),'|');
      file.name = basename + ".txt";
      break;
  }

  return file;
}

// convert all letters to dashes
// used to separate the header from the table (txt file)
function toDashes(s) {
  return '-'.repeat(s.length);
}

// align columns of a table to the left
// one space is left on both sides
function padTable(tableExport) {
  // if the table is empty
  if (tableExport.length == 0) {
    return tableExport
  }
  // create a new trimmed table
  var t = tableExport.map(l=>l.map(c=>c.trim()));

  // get the table header to count columns
  const h = t[0];
  for (let j = 0; j < h.length; j++) {
    const max = Math.max(...t.map(l=>l[j].length))+2;
    for (let i = 0; i < t.length; i++) {
      t[i][j] = (' ' + t[i][j]).padEnd(max, ' ')
    }
  }

  return [t[0],t[0].map(toDashes),...t.slice(1)]
}

// check if thearrays are identical up to spaces
// used to compare CSV header
function sameArray(a,b) {
  return a.length == b.length && a.every((e,i)=>e.trim().toLowerCase()==b[i].trim().toLowerCase());
}

// try to guess CSV separator from text data
// return null if no separator found
function guessSeparator(s) {
  s = s.trim();
  // try to guess from the first line
  const firstline = s.split(/\r?\n/,1);
  if (firstline.length == 0) {
    return null
  }
  for (let sep of ['|',';',',']) {
    const fl = firstline[0].split(sep);
    if (sameArray(fl,resultsHeader)) {
      return sep
    }
  }
  // try to guess from all lines
  for (let sep of ['|',';',',']) {
    const l = s.split(/\r?\n/);
    if (l.every(l=>l.split(sep).length == 4)) {
      return sep
    }
  }
  return null
}

// secure split of line to array
// take care of decimal separator ',' if same as the csv separator
// and convert the decimal separator to '.' in the last (4th) column
// if less tehn 4 columns, fill with empty strings
function lineToArray(l, sep) {
  var a = l.split(sep).map(c=>c.trim());
  a = [...a.slice(0,3),a.slice(3).join(',').replace(',','.')]
  if (a.length < 4) {
    a = [...a, ...new Array(4-a.length).fill('')]
  }
  return a;
}

// check if string is composed only of dashes
function isNotDashes(s) {
  return s.split('-').some(c=>c);
}

// convert CSV text to a table
// empty table if no separator found (or empty text)
// all rows have 4 columns
function CSVToTable(text) {
  // remove quotes and clear empty lines at both ends
  text = text.replaceAll('"','').trim();
  // try to guess the separator
  const sep = guessSeparator(text);
  if (sep == null) {
    return []
  }

  // convert to array of lines
  var a = text.split(/\r?\n/);
  // convert lines to cells
  a = a.map(l=>lineToArray(l, sep));

  // if txt file
  if (sep == '|') {
    // remove only dashed line (like the line after the header), if any
    a = a.filter(l=>l.some(c=>isNotDashes(c)));
  }

  return a;
}

// indexLine returns the index of the line containing corresponding to the given num
function indexLine(table, num) {
  for (let i = 0; i < table.length; i++) {
    if (table[i][0] == num) {
      return i
    }
  }

  return -1
}


// stateLines return return the corresponding state array
// tableExport should contains only the lines without score
function stateLines(tableExport, tableCSV) {
  // the table to return : set the header line to true
  var stLines = [state.Header];
  // remove headers
  tableExport = tableExport.slice(1);
  tableCSV = tableCSV.slice(1);
  // check all lines in tableCSV
  for (let l of tableCSV) {
    // get the corresponding line in the tableExport table
    const idx = indexLine(tableExport,l[0]);
    // if the line does not exist in the tableExport table
    if (idx < 0) {
      stLines.push(state.NumError);
      continue;
    }
    // if the line exists in the tableExport table
    if (sameArray(tableExport[idx].slice(0,3),l.slice(0,3))) {
      // if same "Note"
      if (l[3]) {
        stLines.push(state.Ready);
      } else {
        stLines.push(state.Unchanged);
      }
      continue;
    }
    // if the line exists in the tableExport table but with a different name
    stLines.push(state.NameError);
  }

  return stLines;
}

// update notes in tableModel using the notes in tableCSV
// all unused lines are returned
function updateNote(tableModel, tableCSV, tableState) {
  // lines in tableCSV that are not in tableModel
  if (tableCSV.length == 0) {
    return tableModel;
  }
  for (let i = 1; i < tableCSV.length; i++) {
    // update only ready lines
    if (tableState[i] != state.Ready) {
      continue;
    }
    const line = tableCSV[i];
    const idx = indexLine(tableModel,line[0]);
    // if something goeas wrong, stop updating
    if (idx < 0) {
      // we should never be here
      return "L'étudiant avec numéro" + line[0] + " n'existe pas dans la table ! L'exportation est interrompue.";
    }

    tableModel[idx][4] = line[3];
  }
  // no error
  return null;
}

// initiate the dowload of a text file
function downloadTextFile(text, filename, encoding) {
  var blobEncoding = "utf-8";
  var blobMimeType = "text/plain;charset=utf-8";
  // windows encoding is used by Apogée
  if (encoding == "windows") {
    const windowsEncoder = new CustomTextEncoder('windows-1252', {NONSTANDARD_allowLegacyEncoding: true})
    text = windowsEncoder.encode(text);
    blobEncoding = "windows-1252";
    blobMimeType = "text/plain;charset=windows-1252"; 
  }
  
  if (window.Blob) {
    var blob = new Blob([text], {encoding:blobEncoding,type:blobMimeType});
  }
  else if (window.BlobBuilder) {
    // old scool
    window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
                        window.MozBlobBuilder || window.MSBlobBuilder;
    var bb = new BlobBuilder();
    bb.append(text);
    var blob = bb.getBlob(mime);
  }
  else {
    console.log('Problème : pas de Blob, ni de BlobBuilder :(')
  }

  saveAs(blob, filename);
}

//init the download of a zip file
function downloadZip(files, filename) {
  var zip = new JSZip();
  for (let f of files) {
    zip.file(f.name, f.content);
  }
  zip.generateAsync({type:"blob"}).then(function(content) {
    saveAs(content, filename);
  });
}

// ---------------------------
// PWA
// ---------------------------

// Register the service worker
if ('serviceWorker' in navigator) {
  // Wait for the 'load' event to not block other work
  window.addEventListener('load', async () => {
    // Try to register the service worker.
    try {
      const reg = await navigator.serviceWorker.register(
        '/apogie/pwa_sw.js',
        {scope: '/apogie/'}
      );
      console.log('PWA service worker registered! 😎', reg);
    } catch (err) {
      console.log('😥 PWA service worker registration failed: ', err);
    }
  });
}
