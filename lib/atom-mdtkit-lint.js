'use babel';
"use strict";

import { Range } from 'atom';
import { allowUnsafeEval } from 'loophole';
const _ = require('lodash');

let mdtLinterActive = true;

export function activate(state) {
    mdtLinterActive = !!state.mdtLinterActive;
    require('atom-package-deps').install('atom-mdtkit-lint');
}

export function serialize() {
    return { "mdtLinterActive" : mdtLinterActive };
}

export function toggle(){
    mdtLinterActive = !mdtLinterActive;
    atom.notifications.addInfo("MDTLit Linter " + (mdtLinterActive? "enabled" : "disabled") + ".");
}

export function provideLinter() {
    return {
        name: 'MDTKit Lint',
        grammarScopes: ['source.md'],
        scope: 'project',
        lintOnFly: true,
        lint: editor => {

            if(!AtomMDTKitLint.mdtLinterActive){
                return Promise.resolve([]);
            }
            const path = editor.getPath();
            const MDTKitParser = allowUnsafeEval => require('../../src/mdtkit-parser');
            const result = MDTKitParser.instance.parse(path);

            const returnValue = [];

            if(_.has(result, "linter")) {
                _.each(result.linter.errors, error => {
                    returnValue.push({
                        type: "Error",
                        text: error.message,
                        filePath: error.path,
                        range: new Range(
                            [error.location.start.line, error.location.start.column],
                            [error.location.end.line, error.location.end.column]
                        )
                    })
                });

                _.each(result.linter.stack, stackElem => {
                    returnValue.push({
                        type: "Error",
                        text: "Parsing failed on '" + _.first(stackElem.blockName.split("_")) + "'",
                        filePath: stackElem.path,
                        range: new Range(
                            [stackElem.location.start.line, error.location.start.column],
                            [stackElem.location.end.line, error.location.end.column]
                        )
                    });
                });
            }

            return Promise.resolve(returnValue);
        }
    };
}
