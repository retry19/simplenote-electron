import { EventEmitter } from 'events';
import CoreImporter from '../';
import { startsWith } from 'lodash';

import * as T from '../../../types';

class TextFileImporter extends EventEmitter {
  constructor(
    addNote: (note: T.Note) => any,
    options,
    recordEvent: (eventName: string, eventProperties: T.JSONSerializable) => any
  ) {
    super();
    this.addNote = addNote;
    this.options = options;
    this.recordEvent = recordEvent;
  }

  importNotes = (filesArray) => {
    const coreImporter = new CoreImporter(this.addNote);
    let importedNoteCount = 0;
    let lastFileName = '';

    if (!filesArray) {
      this.emit('status', 'error', 'No files to import.');
      return;
    }

    const importTextFile = (file) => {
      const hasAllowableName = /\.(txt|md)$/.test(
        file?.name.toLowerCase() ?? ''
      );
      if (!hasAllowableName) {
        return;
      }

      // Limit file size we will read to 1mb
      if (file.size > 1000000) {
        return;
      }

      const fileReader = new FileReader();
      fileReader.onload = (event) => {
        let noteContent = event.target.result;

        // Trim the extension from the file name
        const fileTitle = file.name.substring(0, file.name.lastIndexOf('.'));
        if (!startsWith(noteContent, fileTitle)) {
          // Add the file title to the top of the note content
          noteContent = fileTitle + '\n\n' + noteContent;
        }

        if (!noteContent) {
          // Nothing to import!
          return;
        }

        const modifiedTime = file.lastModified / 1000;
        coreImporter.importNote(
          {
            content: noteContent,
            modificationDate: modifiedTime,
            creationDate: modifiedTime,
          },
          this.options
        );

        importedNoteCount++;
        if (file.name === lastFileName) {
          this.emit('status', 'complete', importedNoteCount);
          this.recordEvent('importer_import_completed', {
            source: 'plaintext',
            note_count: importedNoteCount,
          });
        } else {
          this.emit('status', 'progress', importedNoteCount);
        }
      };

      fileReader.readAsText(file);
    };

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      if (i + 1 === filesArray.length) {
        lastFileName = file.name;
      }
      importTextFile(file);
    }
  };
}

export default TextFileImporter;
