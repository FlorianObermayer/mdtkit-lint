'use babel';

import { Range } from 'atom';
import { allowUnsafeEval } from 'loophole';
const _ = require('lodash');
//const MDTKitParser = require('C:/git/mdtkit-parser'); //TODO: use real path after testing / publishing!!!
const MDTKitParser = require('mdtkit-parser');
const fs = require('fs');
function traceResolvedValues(tests) {

  const traces = [];

  const pushTrace = (valueElement) => {
    traces.push({
      type: 'Info',
      text: JSON.stringify(valueElement.value, null, 2),
      filePath: valueElement.path,
      range: new Range(
          [valueElement.location.start.line-1, valueElement.location.start.column-1],
          [valueElement.location.end.line-1, valueElement.location.end.column-1]
      ),
      severity: "info"
    });
  };

  const pushConstantsTraces = (prePostConstants) => {
    _.each(prePostConstants , prePostConstant => {
      if((prePostConstant.arithmeticallyResolved !== undefined && !!prePostConstant.arithmeticallyResolved === true) ||
          (prePostConstant.expression.replaced !== undefined && !!prePostConstant.expression.replaced === true)) {
        pushTrace(prePostConstant.expression);
      }
    });
  };

  const pushTableValuetrace = (tableContent) => {
    _.each(tableContent , row => {
      _.each(row, cell => {
        if((cell.arithmeticallyResolved !== undefined && !!cell.arithmeticallyResolved === true) ||
            (cell.replaced !== undefined && !!cell.replaced === true)) {
          pushTrace(cell);
        }
      });
    });
  };

  _.each(tests, test => {
    pushConstantsTraces(test.preConstants);
    pushConstantsTraces(test.postConstants);
    pushTableValuetrace(test.table.content)
  });

  return traces;
}

function shouldLint(filepath){
  const folderList = atom.config.get('mdtkit-lint').folderList;
  const isBlacklist = atom.config.get('mdtkit-lint').treatAsBlacklist;

  if(_.indexOf(folderList, '*') !== -1){
    if(isBlacklist){
      return false;
    }
    return true;
  }

  try{
    const resolvedPath = fs.realpathSync(filepath);
    const resolvedFolders = _.map(folderList, it => fs.realpathSync(_.trim(it, '"\'')));

    if(_.some(resolvedFolders, it => resolvedPath.indexOf(it) === 0)){
      if(isBlacklist){
        return false;
      }
      return true;
    }

  }catch(e){
    atom.notifications.addWarning('mdtkit-lint: bad folder check list', {detail: "the provided folder list causes some troubles. Please check given paths under settings. Exception:\n" + e.message});
  }
  if(isBlacklist){
    return true;
  }
  return false;
}

module.exports = {
  config: {
    showTooltipForResolvedValues: {
      title: 'Show tooltip for resolved values',
      type: 'boolean',
      default: true
    },
    ignoreImportOnlyFiles: {
      title: 'Disable direct parsing of import only files by labels',
      description: 'Provide a comma separated list of labels which will force the parser to ignore files staring with such a label.',
      type: 'array',
      default: ['$IMPORT_ONLY$'],
      item: {
        type: "string"
      }
    },
    folderList: {
      title: 'Folders to be checked by the linter',
      description: 'Provide a comma separated list of directories which should be checked by the linter.',
      type: 'array',
      default: ['*'],
      item: {
        type: "string"
      }
    },
    treatAsBlacklist: {
      description: 'treat folder list as blacklist',
      type: 'boolean',
      default: false
    }
  },
  activate() {
    require('atom-package-deps').install('mdtkit-lint');
  },
  provideLinter() {
    return {
      name: 'MDTKit Lint',
      grammarScopes: ['source.gfm', 'source.pfm'],
      scope: 'file',
      lintOnFly: true,
      lint: editor => {
        return new Promise((resolve, reject) => {
          let returnValue = [];

          const text = editor.getText();
          const path = editor.getPath();

          if(!shouldLint(path)){
            return resolve(returnValue);
          }

          if(_.some(atom.config.get("mdtkit-lint").ignoreImportOnlyFiles, ignoreLabel => text.startsWith(ignoreLabel))){
            return resolve(returnValue);
          }

          try{
            const result = allowUnsafeEval(() => MDTKitParser.instance.parseText(text, path));
            if(atom.config.get("mdtkit-lint").showTooltipForResolvedValues){
              returnValue = returnValue.concat(traceResolvedValues(result.tests));
            }
            _.each(result.linter.errors, error => {
              returnValue.push({
                type: 'Error',
                text: error.message,
                filePath: error.path,
                range: new Range(
                    [error.location.start.line-1, error.location.start.column-1],
                    [error.location.end.line-1, error.location.end.column-1]
                )
              });
            });

            _.each(result.linter.stack, stackElem => {
              returnValue.push({

                type: 'Error',
                text: `Parsing failed on \'${_.first(stackElem.blockName.split('_'))}\'`,
                filePath: stackElem.path,
                range: new Range(
                  [stackElem.location.start.line-1, stackElem.location.start.column-1],
                  [stackElem.location.end.line-1, stackElem.location.end.column-1]
                )
              });
            });
            return resolve(returnValue);
          }catch(e){
            returnValue.push({
              type: 'Error',
              text: "A critical error occurred: " + e.message
            });
          }
          return resolve(returnValue);
        });
      }
    };
  }
};
