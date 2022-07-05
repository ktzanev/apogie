"use strict";

// the standard header for exam CSV file
const resultsHeader = ["Num", "NOM", "PRENOM", "Note"];


// the possible states of the new lines
const state= Object.freeze({
  Header: 0, // the header line
  Ready: 1, // line with ok first 3 columns, and score in the 4th (befor score was empty)
  Changed: 2, // line with ok first 3 columns and a changed score in the 4th
  Unchanged: 3, // line with ok first 3 columns and no score in the 4th, or same score as before
  NameError: 4, // line with wrong name(s) (2nd and 3d column)
  NumError: 5, // line with a wrong num (1st column)
});


var app = new Vue({
  el: '#app',
  data         : {
    // import Model data
    filenameModel     : '',
    txtModel          : '',
    model             : null, // object containing TITRES, COLONNES, VALEURS et TYP_RES (inutile)
    logModel          : [],
    filepath          : "", // path to Apogée files
    info              : null, // the info data about the module
    tableModel        : [], // the table data (2 dimensional array) extracted from model["VALEURS"]
    tableExport       : [], // 4 column table extracted from the tableModel, with results header
    clearScores       : true, // clear scores in the table
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
    exportChanged     : false, // true if to export changed scores
    // interface variables
    draggModel         : false, // true if the model file is dragged
    draggCSV           : false, // true if the csv file is dragged
    hideTableModel    : true, // hide the model table
    hideFiles         : true, // hide the export csv files
    showReadyCSV      : false, // show the csv lines with new score in the table
    showChangedCSV    : false, // show the csv lines with changed scores in the table
    showUnchangedCSV  : false, // show the unchanged csv lines in the table
    showErrorsCSV     : false, // show the errors csv lines in the table
    showCopy          : false, // show the path to copy
  },
  watch: {
    // triged when model is uploaded
    txtModel: function (val) {
      // clear log
      this.logModel.length = 0;
      // set the model object
      this.model = splitModel(val);
      if (!this.model["TITRES"] || !this.model["COLONNES"] || !this.model["VALEURS"]) {
        log(this.logModel,"error","Le fichier n'est pas un fichier maquette d'Apogée.");
        this.validModel = null;
        return;
      }
      // get the filepath
      this.filepath = getValue(this.model["TITRES"], "apoC_Fichier_Exp")
        .split('\\').slice(0,-1).join('\\');
      if (this.filepath) {
        this.filepath += '\\';
      }
      // set info object about the model (recovered from the header line apoL_c0001)
      //    it is null if some error occured or the model is empty
      this.info = this.getInfo(this.model["COLONNES"]);
      // set the tableModel
      if (this.info) {
        this.tableModel = this.getTableModel(this.model["VALEURS"]);
      } else {
        this.tableModel = [];
      }
      // set the tableExport
      this.tableExport = this.getTableExport(this.tableModel);
      // set validModel
      this. validModel = this.model && this.info && this.logModel.filter(l=>l.type == 'error').length == 0;
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
    tableCSVbefore: function () {
      return correspondingLines(this.tableExport, this.tableCSV);
    },
    stateLines: function () {
      return stateLines(this.tableExport, this.tableCSV);
    },
    numReadyCSV: function () {
      return this.stateLines.filter(l => l == state.Ready).length;
    },
    numChangedCSV: function () {
      return this.stateLines.filter(l => l == state.Changed).length;
    },
    numUnchangedCSV: function () {
      return this.stateLines.filter(l => l == state.Unchanged).length;
    },
    numNumErrorsCSV: function () {
      return this.stateLines.filter(l => l == state.NumError).length;
    },
    numNameErrorsCSV: function () {
      return this.stateLines.filter(l => l == state.NameError).length;
    },
    numErrorsCSV: function () {
      return this.numNumErrorsCSV + this.numNameErrorsCSV;
    },
    numToExportCSV: function () {
      return this.numReadyCSV + (this.exportChanged ? this.numChangedCSV : 0);
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
      var name = this.filenameModel.replace(/\.txt$/i, "").replace(/\W+/g, '-') || "Apogee";
      name += "-" + (this.filebase).normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0,8).replace(/\W+/g, '-') + ".txt";
      return name;
    },
    // set the full path (used to be copied in clipboard)
    fullnameModelNew: function() {
      return this.filepath + this.filenameModelNew;
    },
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
    getInfo(colonnes_txt) {
      // if no table
      if (colonnes_txt.length == 0) {
        return null;
      }
      // apoL_c0001 ...
      var info_module = getLineStartingWith(colonnes_txt, "apoL_c0001");
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
    getTableModel(valeurs_txt) {
      var table = tsvToTable(valeurs_txt);
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
    getTableExport: function(tableModel) {
      // remove the header line
      var body = tableModel.slice(1);
      // keep only columns 0,1,2,4 (num, nom, prenom, note)
      body = body.map(l=>l.filter((c,i)=> i<3 || i==4));
      // if some line has no 4th column, add an empty string
      body = body.map(l=>l.length < 4 ? l.concat("") : l);
      // something to exoprt ?
      var n = body.length;
      if (n  == 0) {
        if (app.model["VALEURS"].length > 0) {
          log(app.logModel,"error","Pas de lignes à exporter.")
        }
        return [];
      }
      log(app.logModel,"info",`${n} lignes sont à exporter.`);
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
        case state.Unchanged:
          return app.showUnchangedCSV ? 'state-unchanged' : 'state-hidden';
        case state.Changed:
          return app.showChangedCSV ? 'state-changed' : 'state-hidden';
        case state.NameError:
          return app.showErrorsCSV ? 'state-name-error' : 'state-hidden';
        case state.NumError:
          return app.showErrorsCSV ? 'state-num-error' : 'state-hidden';
        default:
          return '';
      }
    },
    // file links for stage 2 (the intermediate download)
    downloadFR(e) {
      const file = tableToFile(app.tableExport, "fr.csv", app.filebase, app.clearScores);
      downloadTextFile(file.text, file.name);
    },
    downloadEN(e) {
      const file = tableToFile(app.tableExport, "en.csv", app.filebase, app.clearScores);
      downloadTextFile(file.text, file.name);
    },
    downloadTXT(e) {
      const file = tableToFile(app.tableExport, "txt", app.filebase, app.clearScores);
      downloadTextFile(file.text, file.name);
    },
    downloadZip(e) {
      var zip = new JSZip();
      // add the files to the zip
      for (let t of ["fr.csv", "en.csv", "txt"]) {
        let file = tableToFile(app.tableExport, t, app.filebase, app.clearScores);
        zip.file(file.name, file.text);
      }
      // add LISEZMOI.txt
      zip.file("LISEZMOI.txt", lisezmoi);
      // generate a blob for download and initiate a download
      zip.generateAsync({type:"blob"}).then(function(blob) {
        saveAs(blob, app.filebase + ".zip");
      });
    },
    downloadVisiblesCSV(e) {
      const tableVisible = app.tableCSV.filter((l,i) => i == 0 || this.stateClass(app.stateLines[i]) != 'state-hidden');
      const file = tableToFile(tableVisible, "fr.csv", app.filebase+".visible", false);
      downloadTextFile(file.text, file.name);
    },
    // the link in stage 4 (the final download)
    DownloadUpdateModel(e) {
      const tableModelUpdated = updateNote(app.tableModel, app.tableCSV, app.stateLines);
      if (tableModelUpdated == null) {
        // we should never get here because all ready lines should be ok for updateNote
        log(app.logCSV, "error", "Problème lors de la mise à jour des notes :(");
        return
      }
      if (tableModelUpdated.length == 0) {
        // we should never get here because if nothing to update we can't initiate the download
        log(app.logCSV, "error", "Pas de notes à exporter.");
        return
      }
      const valeurs_txt = tableToCSV(tableModelUpdated, 12, '\t', "\r\n");
      app.model['TITRES'] = headerSetFilename(app.model['TITRES'], app.filenameModelNew);
      app.model['TITRES'] = headerSetDate(app.model['TITRES']);
      app.model['COLONNES'] = UpdateColonnes(app.model['COLONNES']);
      downloadTextFile(header(app.model) + valeurs_txt, app.filenameModelNew, "windows")
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

// split model to parts
function splitModel(txtModel) {
  const parts = txtModel.trim().split(/XX-APO_(.*?)-XX/);
  var model = {}
  for (let i = 1; i < parts.length;) {
    model[parts[i]] = parts[i+1];
    i += 2;
  }
  return model;
}

// return the first line starting with the given pattern
// used to recover infos from TITRES and COLONNES parts
function getLineStartingWith(str, pattern) {
  const n = str.indexOf(pattern)
  if (n < 0) {
    return "";
  }
  return str.slice(n).split(/\r?\n/)[0]
}

// get a value from TITRES (a 2 column tsv)
function getValue(titres_txt, pattern) {
  const line = getLineStartingWith(titres_txt, pattern);
  return line.slice(pattern.length).trim();
}

// normalize array to have n columns (fill with empty strings)
function normalizeColumns(array,n) {
  return array.concat(new Array(n).fill('')).slice(0,n);
}

// normalize all line of tsv string to have the same number of columns
function normalizeLines(tsv,n) {
  return tsv
    .trim()
    .split(/\r?\n/)
    .map(l=>normalizeColumns(l.split('\t'),n).join('\t')) // normalize columns in each line
    .join('\r\n');
}

// reconstruct model parts : TITRES, COLONNES.
// Adds XX-APO_VALEURS-XX at the end.
function header(model) {
  var res = '';
  res += 'XX-APO_TITRES-XX\r\n' + normalizeLines(model['TITRES'],12) + '\r\n\r\n';
  res += 'XX-APO_COLONNES-XX\r\n' + normalizeLines(model['COLONNES'],12) + '\r\n\r\n';
  res += 'XX-APO_VALEURS-XX\r\n';
  return res;
}

// replace the filename in the header
function headerSetFilename(titres_txt, filename) {
  const regex = /apoC_Fichier_Exp\t.*$/m;
  const subst = `apoC_Fichier_Exp\t` + filename;
  return titres_txt.replace(regex, subst);
}

// replace the date/time in the header
function headerSetDate(titres_txt) {
  const d = new Date();
  const strDate = [d.getDate().toString().padStart(2, '0'), (d.getMonth()+1).toString().padStart(2, '0'), d.getFullYear()].join('/');
  const strTime = d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
  const regex = /Export Apogée du .*\d/m;
  const subst = `Export Apogée du ${strDate} à ${strTime}`;
  return titres_txt.replace(regex, subst);
}

// Not clear that this is very useful.
// Looks like black magic to me!
function UpdateColonnes(colonnes_txt) {
  return colonnes_txt
    .replace(/\t\tNom/, '\t1\tNom')
    .replace(/\t\tPrénom/, '\t1\tPrénom')
    .replace(/apoL_c0004\tAPO_COL_VAL_FIN(.*)$/m, `apoL_c0004\tAPO_COL_VAL_FIN`+'\t'.repeat(9) + `1\t`);
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

// remove data from column
function colClear(l,i) {
  l[i] = '';
  return l;
}

// convert two dimensional table to a CSV string
function tableToCSV(t, numcols, sep, eol) {
  return t.map(l=>normalizeColumns(l,numcols).join(sep)).join(eol)+eol;
}

// return {text, filename} for a text file
function tableToFile(tableExport, type, basename, clearScores) {
  var file = {} // {text, filename}
  var  tExp = tableExport
  if (clearScores) {
    // clear the score (last column)
    tExp = tExp.map((l,i) => i==0 ? l : colClear(l,3))
  }
  switch (type) {
    case "fr.csv":
      file.text = tableToCSV(tExp.map(l=>colReplace(l,3,'.',',')), 4, ';', '\n');
      file.name = basename + ".fr.csv";
      break;
    case "en.csv":
      file.text = tableToCSV(tExp.map(l=>colReplace(l,3,',','.')), 4, ',', '\n');
      file.name = basename + ".en.csv";
      break;
    case "txt":
      file.text = tableToCSV(padTable(tExp), 4, '|', '\n');
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
  a = normalizeColumns(a,4)
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


// convert a table string like "N'OM Pré--nom Double" to a string like 'NOM PRE NOM DOUBLE'
function normalizeName(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[- ]+/g,' ').trim().replace(/[^\w ]+/g, '').toUpperCase();
}

// compare week equality : a[1]~b[1] and a[2]~b[2]
// a and b are 3 arrays of strings
function samePerson(a, b) {
  if (a.length < 3 || b.length < 3) {
    return false
  }

  return normalizeName(a[1]+" "+a[2]) == normalizeName(b[1]+" "+b[2]);
}

// correspondingLines returns a table of lines from tableExport that correspond to tableCSV
function correspondingLines(tableExport, tableCSV) {
  // create a new table, start with the header
  var oldLines = [tableCSV[0]];
  for (let l of tableCSV.slice(1)) {
    var oldline;
    const idx = indexLine(tableExport, l[0]);
    if (idx >= 0) {
      // Num, NOM, PRENOM, Note
      oldline = tableExport[idx]
    } else {
      // if no line found, use an empty one
      oldline = ['','','',''];
    }  
    oldLines.push(oldline);
  }

  return oldLines;
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
    // lines without score are ignored
    if (!l[3].trim()) {
      stLines.push(state.Unchanged);
      continue;
    }
    // get the corresponding line in the tableExport table
    const idx = indexLine(tableExport,l[0]);
    // if the line does not exist in the tableExport table
    if (idx < 0) {
      stLines.push(state.NumError);
      continue;
    }

    // if the line exists in the tableExport table
    if ( samePerson(tableExport[idx],l) ) {
      if (tableExport[idx][3] == l[3]) {
        stLines.push(state.Unchanged);
      } else {
        if (tableExport[idx][3] == '') {
          stLines.push(state.Ready); // if the score is empty, it is ready to be filled
        } else {
          stLines.push(state.Changed); // if the score is not empty, should it be changed
        }
      }
    } else {
      // if the line exists in the tableExport table but with a different name
      stLines.push(state.NameError);
    }
  }

  return stLines;
}

// update notes in tableModel using the notes in tableCSV
// all unused lines are returned
function updateNote(tableModel, tableCSV, tableState) {
  var tableNew = [];
  // update scores
  for (let i = 1; i < tableCSV.length; i++) {
    // update only ready lines
    if (tableState[i] != state.Ready && (tableState[i] != state.Changed || !app.exportChanged)) {
      continue;
    }
    const line = tableCSV[i];
    const idx = indexLine(tableModel,line[0]);
    // if something goeas wrong, stop updating
    if (idx < 0) {
      // we should never be here
      return null;
    }
    // new student (keep the first 3 columns)
    var newline = tableModel[idx];
    // update the score
    newline[4] = line[3];
    newline[5] = '20'; // the maximal possible score is 20
    // add the new line to the table
    tableNew.push(newline);
  }
  // remove lines without score
  tableNew = tableNew.filter(l=>!isNaN(parseFloat(l[4])));
  // if nothing to update, return empty table
  if (tableNew.length == 0) {
    return [];
  }
  // keep the header and sort by NOM,Prenom
  return [tableModel[0], ...tableNew.sort((a, b) => a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]))];
}


// utility constant for UnicodeToWindows1252
const windows1252 = '\x00\x01\x02\x03\x04\x05\x06\x07\b\t\n\v\f\r\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7F€\x81‚ƒ„…†‡ˆ‰Š‹Œ\x8DŽ\x8F\x90‘’“”•–—˜™š›œ\x9DžŸ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ';
// convert Unicode to Windows-1252
function UnicodeToWindows1252(s) {
  var data = [];
  for (let c of s.normalize("NFC")) {
    var d = windows1252.indexOf(c);
    if (d < 0) {
      d = 63; // '?'
    }
    data.push(d);
  }
  return new Uint8Array(data);
}

// initiate the dowload of a text file
function downloadTextFile(text, filename, encoding) {
  var blobEncoding = "utf-8";
  var blobMimeType = "text/plain;charset=utf-8";
  // windows encoding is used by Apogée
  if (encoding == "windows") {
    text = UnicodeToWindows1252(text);
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
