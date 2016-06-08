'use babel';

import { Range } from 'atom';
import { allowUnsafeEval } from 'loophole';
const MDTKitParser = allowUnsafeEval(() => require('mdtkit-parser'));
const _ = require('lodash');

export default {
  activate() {
    require('atom-package-deps').install('mdtkit-lint');
  },
  provideLinter() {
    return {
      name: 'MDTKit Lint',
      grammarScopes: ['source.md'],
      scope: 'file',
      lintOnFly: true,
      lint: editor => {
        const path = editor.getPath();
        const result = allowUnsafeEval(() =>
          MDTKitParser.instance.parseText(editor.getText(), path));

        const returnValue = [];

        if (_.has(result, 'linter')) {
          _.each(result.linter.errors, error => {
            returnValue.push({
              type: 'Error',
              text: error.message,
              filePath: error.path,
              range: new Range(
                  [error.location.start.line, error.location.start.column],
                  [error.location.end.line, error.location.end.column]
              )
            });
          });

          _.each(result.linter.stack, stackElem => {
            returnValue.push({
              type: 'Error',
              text: `Parsing failed on \' ${_.first(stackElem.blockName.split('_'))}\'`,
              filePath: stackElem.path,
              range: new Range(
                [stackElem.location.start.line, stackElem.location.start.column],
                [stackElem.location.end.line, stackElem.location.end.column]
              )
            });
          });
        }
        return Promise.resolve(returnValue);
      }
    };
  }
};
