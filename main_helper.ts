const fs = require('fs');

export function getFiles(dir, files = []) {
    // Get an array of all files and directories in the passed directory using fs.readdirSync
    const fileList = fs.readdirSync(dir)
    // Create the full path of the file/directory by concatenating the passed directory and file/directory name
    for (const file of fileList) {
      const name = `${dir}/${file}`
      // Check if the current file/directory is a directory using fs.statSync
      if (fs.statSync(name).isDirectory()) {
        // If it is a directory, recursively call the getFiles function with the directory path and the files array
        getFiles(name, files)
      } else {
        // If it is a file, push the full path to the files array
        files.push(name)
      }
    }
    return files
  }
  
  export function unbackslash(s) {
    return s.replace(/\\([\\rnt'"])/g, function (match, p1) {
      if (p1 === 'n') {
        return '\n';
      }
      if (p1 === 'r') {
        return '\r';
      }
      if (p1 === 't') {
        return '\t';
      }
      if (p1 === '\\') {
        return '\\';
      }
      return p1;       // unrecognised escape
    });
  }

  export function prompt() {
    let rval = "";
  
    const buffer = Buffer.alloc ? Buffer.alloc(1) : new Buffer(1);
  
    for (; ;) {
      fs.readSync(0, buffer, 0, 1);   
      if (buffer[0] === 10) {   
        break;
      } else if (buffer[0] !== 13) {     
        rval += String(buffer);
      }
    }
  
    return rval;
  }

  export function replacer(key, value) {
    if (value instanceof Map) {
      return {
        dataType: 'Map',
        value: Array.from(value.entries()), 
      };
    } else {
      return value;
    }
  }