import React, { useState, useRef } from 'react';
import "../styles/editor.scss";
import InputGrid from "./DrawingPanel";
import {CirclePicker} from "react-color";
import { exportComponentAsPNG } from "react-component-export-image";
import { saveAs } from "file-saver";

export const colors = ["#000000", "#0068cf", "#ff3937", "#00c443", "#ffd631", "#a0a0a0", "#f916b1", "#ff7a2c", "#63d6fc", "#820f23"]

let circleSize = 28
let circleSpacing = 14

function twoDArrayCopy(arr) {
    const rows = arr.length;
    const cols = arr[0].length;
    var new_arr = Array(arr.length).fill().map(() => Array(arr[0].length));
    for(var i = 0; i < rows; i++) {
        for(var j = 0; j < cols; j++) {
            new_arr[i][j] = arr[i][j];
        }
    }
    return new_arr;
}

function replaceItemsWithoutMutating(arr, row, col, new_val) {
    var new_arr = twoDArrayCopy(arr);
    new_arr[row][col] = new_val;

    return new_arr;
}

// list arr -> 
// finds whatever value is located at indexTrail in startArray
export function calcValFromIndexTrail(indexTrail, startArray) {
    let restrictedArr = startArray;
    let index = 0;

    while(indexTrail[index] != null) {
        restrictedArr = restrictedArr[indexTrail[index]];
        index += 1
    }

    return restrictedArr;
}


export function NumberInput(props) {
    return (
        <div className="option">
            <input
                type="number"
                className="panelInput"
                value={props.value}
                onChange={props.onChange}
            />
            <span className="inputLabel" >{props.name}</span>
        </div>
    )
}

export default function Editor() {

    const [problemId, setProblemId] = useState("other-0"); // identifier for the problem, saved in exported json
    const [problemCat, setProblemCat] = useState("other"); // category for the problem, may change the layout of the editor
    const [defaultGridType, setDefaultGridType] = useState("pixels"); // determines the type of newly created grids
    const [multipleChoice, setMultipleChoice] = useState(false); // determines whether the question is multiple choice
    
    // the list of indices that lead to the currently displayed grid
    // irrelevant when multiple grids are displayed at the same time
    const [currentItemIndexTrail, setCurrentItemIndexTrail] = useState(["context", 0, null]); 
    
    // information about the problem 
    const [problem, setProblem] = 
            useState({"context": [[[createGridCellByType(defaultGridType)]]], 
                     "questions": [{"stimulus": [[createGridCellByType(defaultGridType)]], "answer": [createGridCellByType(defaultGridType)], "correct": 0}]});


    // color with which to modify pixel grids
    const [penColor, setPenColor] = useState(colors[0]);
    
    // the locked variables for various different problem categories
    const lockedVariables = {
                                "arc": {
                                        "contextLength": 1,
                                        "multipleChoice": false,
                                        "defaultGridType": "pixels",
                                        "context-col": 2, 
                                        "stimulus-col": 1, 
                                        "stimulus-row": 1,
                                        "answer-choice": 1, 
                                        "context-gridType": "pixels",
                                        "stimulus-gridType": "pixels",
                                        "answer-gridType": "pixels"
                                    },
                                "bongard": {
                                        "contextLength": 2,
                                        "multipleChoice": true,
                                        "defaultGridType": "pixels",
                                        "context-col": 2,
                                        "context-row": 3,
                                        "stimulus-col": 1,
                                        "stimulus-row": 1, 
                                        "answer-choice": 3, 
                                        "context-gridType": "pixels",
                                        "stimulus-gridType": "pixels",
                                        "answer-gridType": "string",
                                        "answer-choices": ["left", "right", "neither"]
                                },
                                "letter-string": {
                                        "contextLength": 1,
                                        "multipleChoice": false,
                                        "defaultGridType": "string",
                                        "context-col": 2, 
                                        "stimulus-col": 1, 
                                        "stimulus-row": 1,
                                        "answer-choice": 1, 
                                        "context-gridType": "string",
                                        "stimulus-gridType": "string",
                                        "answer-gridType": "string"
                                },
                                "other": {}
                            }
    
    const componentRef = useRef()

    /*
    handlers: STATE-DEPENDENT
    inputs (fields, buttons) call handlers, which translates events into the correct format and calls setters
    if conditions for modification are met
    */

    function handleFileUpload(e) {
        const fileReader = new FileReader();
        fileReader.readAsText(e.target.files[0], "UTF-8");
        fileReader.onload = e => {
            let content = JSON.parse(e.target.result);
            if("context" in content) {
                setStateFromRegFileUpload(content);
            } else {
                setStateFromArcFileUpload(content);
            }
        };
    }
    
    // list evt ->
    // handles events from the SelectLists that change the gridType
    function handleGridTypeChange(indexTrail, event) {
        let newType = event.target.value;

        let stage = calcStage(indexTrail);

        if(!(stage + "-gridType" in lockedVariables[problemCat])) {
            setGridType(indexTrail, newType);
        }
    }

    // ->
    // handles events from the checkbox that controls whether the question is multiple choice
    function handleMultChoiceChange() {
        if("multipleChoice" in lockedVariables[problemCat]) {
            setMultipleChoice(lockedVariables[problemCat]["multipleChoice"]);
        } else {
            setMultipleChoice(!multipleChoice);
        }
    }

    // evt ->
    // handles event from the SelectList that changes problem category
    function handleCatChange(event) {
        let newCat = event.target.value;

        setLockedVariables(newCat);

        setProblemCat(newCat);
    }

    // evt ->
    // handles event from the SelectList that changes the default grid type
    function handleDefaultGridTypeChange(event) {
        let newGridType = event.target.value;

        if(!("defaultGridType" in lockedVariables[problemCat])) {
            setDefaultGridType(newGridType);
        }
    }

    // list evt -> 
    // handles event from input that changes number of rows in a grid
    function handleGridRowChange(indexTrail, event) {
        let newCount = applyBounds(parseInt(event.target.value));
        let stage = calcStage(indexTrail);
        if(!(stage + "-row" in lockedVariables[problemCat])) {
            let gridType = calcGridType(calcValFromIndexTrail(indexTrail, problem));
            setGridRowCount(indexTrail, newCount, () => createGridCellByType(gridType));
        }
    }

    // list evt ->
    // handles event from input that changes number of cols in a grid
    function handleGridColChange(indexTrail, event) {
        let newCount = applyBounds(parseInt(event.target.value));
        let stage = calcStage(indexTrail);
        if(!(stage + "-col" in lockedVariables[problemCat])) {
            let gridType = calcGridType(calcValFromIndexTrail(indexTrail, problem));
            setGridColCount(indexTrail, newCount, () => createGridCellByType(gridType));
        }
        
    }

    // list int -> 
    // handles event from checkboxes that change the correct answer
    function handleCorrectAnswer(indexTrail, index) {
        if(calcStage(indexTrail) === "answer" && multipleChoice) {
            return setCorrectAnswer(indexTrail, index);
        }
    }

    // list int int evt ->
    // handles event from inputs that change the row count of a pixel grid (not the full grid)
    function handleSceneRowChange(indexTrail, row, col, event) {
        let rowCount = parseInt(event.target.value);
        setRowCount(indexTrail, rowCount, row, col);
    }

    // list int int evt ->
    // handles event from inputs that change the col count of a pixel grid (not the full grid)
    function handleSceneColChange(indexTrail, row, col, event) {
        let colCount = parseInt(event.target.value);
        setColCount(indexTrail, colCount, row, col);
    }

    // evt ->
    // handles event from input that changes the number of context grids
    function handleContextLengthChange(event) {
        let newLength = parseInt(event.target.value);
        
        if(!("contextLength" in lockedVariables[problemCat])) {
            setArrayLength(["context"], newLength, () => [[createGridCellByType(defaultGridType)]]);
        }
    }

    // evt ->
    // handles event from input that changes the number of questions
    function handleQuestionLengthChange(event) {
        let newLength = parseInt(event.target.value);
        if(!("questionLength" in lockedVariables[problemCat]) && !("answer-choices" in lockedVariables[problemCat])) {
            setArrayLength(["questions"], newLength, () => ({"stimulus": [[createGridCellByType(defaultGridType)]], "answer": [createGridCellByType(defaultGridType)], "correct": 0}));
        } else if(!("questionLength" in lockedVariables[problemCat])) {
            setArrayLength(["questions"], newLength, () => ({"stimulus": [[createGridCellByType(defaultGridType)]], "answer": lockedVariables[problemCat]["answer-choices"], "correct": 0}));
        }

    }

    // list evt ->
    // handles event from input that changes the number of answer choices
    function handleAnswerLengthChange(indexTrail, event) {
        let newLength = parseInt(event.target.value);

        if(!("questionLength" in lockedVariables[problemCat])) {
            if(newLength > 1 && !multipleChoice) {
                setMultipleChoice(true);
            } else if(newLength < 1) {
                return
            }

            let gridType = calcGridType(calcValFromIndexTrail(indexTrail, problem));
            setArrayLength(indexTrail, newLength, () => createGridCellByType(gridType));
        }
    }

    /*
    getters; STATE-DEPENDENT.
    get important vaues from the state
    */

    // list -> int 
    // gets the correct answer for the question at indexTrail
    function getCorrectAnswer(indexTrail) {
        if(calcStage(indexTrail) === "stimulus" || calcStage(indexTrail) === "answer") {
            return problem[indexTrail[0]][indexTrail[1]]["correct"];
        }
    }

    /*
    setters; STATE-DEPENDENT. set state variables based on given values.
    */
    function setDestToSource(indexTrailSource, indexTrailDest) {
        let newProblem = {...problem};
        let valToCopy = calcValFromIndexTrail(indexTrailSource, newProblem);
        changeValFromIndexTrail(indexTrailDest, valToCopy, newProblem);
        setProblem(newProblem);
    }

    function swapAandB(aIndexTrail, bIndexTrail) {
        console.log("swapping", aIndexTrail, bIndexTrail);
        console.log(problem);
        let newProblem = {...problem};
        let aValue = calcValFromIndexTrail(aIndexTrail, newProblem);
        let bValue = calcValFromIndexTrail(bIndexTrail, newProblem);
        changeValFromIndexTrail(aIndexTrail, bValue, newProblem);
        changeValFromIndexTrail(bIndexTrail, aValue, newProblem);
        setProblem(newProblem);
    }

    // list int ->
    // sets the correct answer for the question at indexTrail to index
    function setCorrectAnswer(indexTrail, index) {
        console.log("setting correct answer");
        let newProblem = {...problem};
        let augIndexTrail = [...indexTrail];
        augIndexTrail[2] = "correct";
        changeValFromIndexTrail(augIndexTrail, index, newProblem)

        setProblem(newProblem);
        return true;
    }

    // list string int int ->
    // changes the string at the given (gridRow, gridCol)
    function setString(indexTrail, newVal, gridRow, gridCol) {
        let grid = calcValFromIndexTrail(indexTrail, problem);
        let copyGrid = [...grid];
        changeValFromIndexTrail([gridRow, gridCol], newVal, copyGrid);

        setProblemGrid(indexTrail, copyGrid);
    }

    // list int int int int int ->
    // replaces the pixel (sceneRow, sceneCol) in the scene at (gridRow, gridCol) with newVal
    function setPixelColor(indexTrail, newVal, sceneRow, sceneCol, gridRow, gridCol) {
        let grid = calcValFromIndexTrail(indexTrail, problem);
        let newArray = replaceItemsWithoutMutating(calcValFromIndexTrail([gridRow, gridCol], grid), sceneRow, sceneCol, newVal);
        let copyGrid = [...grid];
        changeValFromIndexTrail([gridRow, gridCol], newArray, copyGrid);

        setProblemGrid(indexTrail, copyGrid);
    }

    // list int int int ->
    // sets the number of columns for the pixel grid at (r, c) to colCount
    function setColCount(indexTrail, colCount, r, c) {
        let grid = calcValFromIndexTrail(indexTrail, problem);
        let copyArr = changeColCount(calcValFromIndexTrail([r, c], grid), colCount, () => 0);

        let copyGrid = [...grid]; 
        changeValFromIndexTrail([r, c], copyArr, copyGrid);
        setProblemGrid(indexTrail, copyGrid);
    }

    // list int int int ->
    // sets the number of columns for the pixel grid at (r, c) to rowCount
    function setRowCount(indexTrail, rowCount, r, c) {
        let grid = calcValFromIndexTrail(indexTrail, problem);
        let copyArr = changeRowCount(calcValFromIndexTrail([r, c], grid), rowCount, () => 0);

        let copyGrid = [...grid];
        changeValFromIndexTrail([r, c], copyArr, copyGrid);
        setProblemGrid(indexTrail, copyGrid);
    }

    // list int [() => gridElement] ->
    // changes the length of an array to newLength, if newLength is longer, the new elements are given by generator
    function setArrayLength(indexTrail, newLength, generator, alt) {
        let arr = calcValFromIndexTrail(indexTrail, problem)
        console.log(generator())
        let copyArr = [...arr];
        let difference = newLength - copyArr.length;

        for(var i = 0; i < Math.abs(difference); i++) {
            if(difference < 0) {
                copyArr.pop();
            } else if(difference > 0) {
                copyArr.push(generator());
            }
        }
        
        console.log(copyArr);

        let newProblem = setProblemGrid(indexTrail, copyArr, alt);

        return newProblem;
    }
    
    // list int [() => gridElement] ->
    // changes the number of rows in the 2d array at indexTrail, new elements are given by generator
    function setGridRowCount(indexTrail, newRowCount, generator, alt) {
        let prob = probFromAlt(alt);
        let arr = calcValFromIndexTrail(indexTrail, prob);
        let copyArr = changeRowCount(arr, newRowCount, generator);
        
        return setProblemGrid(indexTrail, copyArr, alt);
    }

    // list int [() => gridElement] ->
    // changes the number of cols in the 2d array at indexTrail, new elements are given by generator
    function setGridColCount(indexTrail, newColCount, generator, alt) {
        let prob = probFromAlt(alt);
        let arr = calcValFromIndexTrail(indexTrail, prob);
        let copyArr = changeColCount(arr, newColCount, generator);
        
        return setProblemGrid(indexTrail, copyArr, alt);
    }

    // list grid ->
    // replaces the grid at indexTrail with newGrid
    function setProblemGrid(indexTrail, newGrid, alt) {
        let newProblem = probFromAlt(alt);
        changeValFromIndexTrail(indexTrail, newGrid, newProblem);
        if(typeof alt === 'undefined') {
            setProblem(newProblem);
        }

        return newProblem;
    }

    // int string/int ->
    // sets the indexTrail to the default trail that ends with value at index
    function setIndexTrail(index, value) {
        if(!isNaN(value)) {
            value = parseInt(value);
        } 
        let newIndexTrail = [...currentItemIndexTrail];
        newIndexTrail[index] = value;

        for(let i = index + 1; i < 3; i++) {
            newIndexTrail[i] = null;
        }

        newIndexTrail = populateIndexTrail(newIndexTrail);

        setCurrentItemIndexTrail(newIndexTrail);
    }

    // list string ->
    // sets the grid at indexTrail to have type newType, clears grid of whatever it contains
    function setGridType(indexTrail, newType, alt) {
        let prob = probFromAlt(alt);
        let grid = calcValFromIndexTrail(indexTrail, prob);
        let newGrid;
        
        console.log(alt);
        console.log(grid);

        if(calcStage(indexTrail) === "answer") {
            newGrid = createGrid(grid.length, null, () => createGridCellByType(newType));
            return setProblemGrid(indexTrail, newGrid, alt);
        } else {
            newGrid = createGrid(grid.length, grid[0].length, () => createGridCellByType(newType));
            return setProblemGrid(indexTrail, newGrid, alt);   
        }
    }

    function setStateFromRegFileUpload(content) {
        let newProblemContext = []
        for(let i in content["context"]) {
            let contextGrid = calc2dArrayFromDict(content["context"][i]);
            newProblemContext.push(contextGrid)
        }
        let newProblemQuestions = []
        let newMultipleChoice;
        for(let i in content["questions"]) {
            let stimulusGrid = calc2dArrayFromDict(content["questions"][i]["stimulus"]);
            let answers;
            let correct;
            if(content["questions"][i]["choices"].length === 0) {
                answers = [content["questions"][i]["answer"]];
                correct = 0;
                newMultipleChoice = false;
            } else {
                answers = content["questions"][i]["choices"];
                correct = content["questions"][i]["answer"];
                newMultipleChoice = true;
            }
            newProblemQuestions.push({"stimulus": stimulusGrid, "answer": answers, "correct": correct})
        }
        let newProblem = {"context": newProblemContext, "questions": newProblemQuestions};
        setProblem(newProblem)
        setProblemId(content["id"]);
        setProblemCat(content["category"]);
        setMultipleChoice(newMultipleChoice);
    }

    function setStateFromArcFileUpload(content) {
        let contextGrid = [];
        for(let i in content["train"]) {
            let input_grid = content["train"][i]["input"];
            let output_grid = content["train"][i]["output"];
            contextGrid.push([input_grid, output_grid])
        }
        let newProblemContext = [contextGrid];
        let newProblemQuestions = []
        for(let i in content["test"]) {
            let stimulusGrid = [[content["test"][i]["input"]]];
            let answer = [content["test"][i]["output"]];
            let correct = 0;
            newProblemQuestions.push({"stimulus": stimulusGrid, "answer": answer, "correct": correct});
        }
        let newProblem = {"context": newProblemContext, "questions": newProblemQuestions};
    
        setProblem(newProblem)
        setProblemId("arc-0");
        setProblemCat("arc");
        setMultipleChoice(false);
    }

    function setDefaultProblem() {
        let newProblem = {"context": [[[createGridCellByType(defaultGridType)]]], 
                     "questions": [{"stimulus": [[createGridCellByType(defaultGridType)]], "answer": [createGridCellByType(defaultGridType)], "correct": 0}]}
        setLockedVariables(problemCat, newProblem);

    }

    // string ->
    // sets all variables to their locked values for the given category 
    function setLockedVariables(cat, newProblem = 0) {
        if(newProblem === 0) {
            newProblem = {... problem};
        }
        for(let key in lockedVariables[cat]) {
            let keySplit = key.split("-")
            if(key === "contextLength") {
                newProblem = setArrayLength(["context"], lockedVariables[cat]["contextLength"], () => [[createGridCellByType(defaultGridType)]], newProblem);
            } else if(key === "multipleChoice") {
                setMultipleChoice(lockedVariables[cat]["multipleChoice"]);
            } else if(key === "defaultGridType") {
                setDefaultGridType(lockedVariables[cat]["defaultGridType"]);
            } else if(keySplit[0] === "context" && ["row", "col"].includes(keySplit[1])) {
                let len = newProblem["context"].length;
                for(let gridIndex = 0; gridIndex < len; gridIndex++) {
                    let gridType = calcGridType(calcValFromIndexTrail(["context", gridIndex], newProblem));
                    if(keySplit[1] === "row") {
                        newProblem = setGridRowCount(["context", gridIndex], lockedVariables[cat]["context-row"], () => createGridCellByType(gridType), newProblem);
                    } else if(keySplit[1] === "col") {
                        newProblem = setGridColCount(["context", gridIndex], lockedVariables[cat]["context-col"], () => createGridCellByType(gridType), newProblem);
                    }      
                }
            } else if(["stimulus", "answer"].includes(keySplit[0]) && ["row", "col"].includes(keySplit[0])) {
                let len = newProblem["questions"].length;
                for(let gridIndex = 0; gridIndex < len; gridIndex++) {
                    let gridType = calcGridType(calcValFromIndexTrail(["context", gridIndex], newProblem));
                    if(keySplit[1] === "row") {
                        newProblem = setGridRowCount(["questions", gridIndex, keySplit[0]], lockedVariables[cat][keySplit[0] + "-row"], () => createGridCellByType(gridType), newProblem);
                    } else if(keySplit[1] === "col") {
                        newProblem = setGridColCount(["questions", gridIndex, keySplit[0]], lockedVariables[cat][keySplit[0] + "-col"], () => createGridCellByType(gridType), newProblem);
                    }   
                }

            } else if(keySplit[0] === "context" && keySplit[1] === "gridType") {
                let len = newProblem["context"].length;
                for(let gridIndex = 0; gridIndex < len; gridIndex++) {
                    console.log(newProblem["context"][gridIndex]);
                    newProblem = setGridType(["context", gridIndex], lockedVariables[cat]["context-gridType"], newProblem);
                }
            } else if(["stimulus", "answer"].includes(keySplit[0]) && keySplit[1] === "gridType") {
                let len = newProblem["questions"].length;
                for(let gridIndex = 0; gridIndex < len; gridIndex++) {
                    newProblem = setGridType(["questions", gridIndex, keySplit[0]], lockedVariables[cat][keySplit[0] + "-gridType"], newProblem);
                }
            } else if(keySplit[0] === "answer" && keySplit[1] === "choice") {
                let len = newProblem["questions"].length;
                for(let gridIndex = 0; gridIndex < len; gridIndex++) {
                    let gridType = calcGridType(calcValFromIndexTrail(["questions", gridIndex, "answer"], newProblem));
                    newProblem = setArrayLength(["questions", gridIndex, "answer"], lockedVariables[cat]["answer-choice"], () => createGridCellByType(gridType), newProblem);
                }
            } else if(keySplit[0] === "answer" && keySplit[1] === "choices") {
                let len = newProblem["questions"].length;
                let choiceLen = newProblem["questions"][0]["answer"].length;
                for(let gridIndex = 0; gridIndex < len; gridIndex++) {
                    for(let choiceIndex = 0; choiceIndex < choiceLen; choiceIndex++) {
                        newProblem["questions"][gridIndex]["answer"][choiceIndex] = lockedVariables[cat]["answer-choices"][choiceIndex];
                    }
                }

            }
        }
        setProblem(newProblem);
    }

    /*
    calculators; STATE-INDEPENDENT. calculates something based on given values. (sort of like state-independent getters)
    */

    // list ->
    // Calculates the stage ("context", "stimulus", or "answer") based on the given indexTrail
    function calcStage(indexTrail) {
        if(indexTrail.includes("context")) {
            return "context";
        } else if(indexTrail.includes("stimulus")) {
            return "stimulus";
        } else if(indexTrail.includes("answer")) {
            return "answer";
        } else {
            return false; 
        }
    }

    // list -> 
    // given a grid of scenes/strings, deduces whether it is a set of 
    // answer choices (answer choices have one fewer dimension)
    function calcIsAnswerGrid(grid) {
        let restrictedArr = grid;
        let dimCounter = 0;
        while(restrictedArr.constructor === Array) {
            restrictedArr = restrictedArr[0]
            dimCounter += 1;
        }
        return (dimCounter % 2 === 1);
    }

    // arr ->
    // examines array elements to see if it is a grid of strings or scenes
    function calcGridType(gridGiven) {
        let gridElement;

        if(calcIsAnswerGrid(gridGiven)) {
            gridElement = gridGiven[0];
        } else {
            gridElement = gridGiven[0][0];
        }

        if(typeof gridElement === 'string') {
            return "string";
        } else if(gridElement.constructor === Array) {
            return "pixels";
        }
    }

    function calc2dArrayFromDict(dict) {
        let grid = []
        let num_cols = dict["cols"]
        for(let i in dict["items"]) {
            let row_index = Math.floor(i / num_cols);
            
            // start a new row if necessary
            if(row_index >= grid.length) {
                grid.push([]);
            }
            grid[row_index].push(dict["items"][i]);
        }

        return grid;
    }
    
    /*
    changers & creators; STATE-INDEPENDENT. create or change objects based on given quantities, 
    do not read from or write to state. (sort of like state-independent setters)
    */

    // list int [() => any] -> arr
    // add or substact rows from arr so that the count matches newRowCount, if new rows are being added,
    // generate new entries using generator
    function changeRowCount(arr, newRowCount, generator) {
        let oldRowCount = arr.length;
        let colCount = arr[0].length;
        let copyArr = twoDArrayCopy(arr);
        let difference = newRowCount - oldRowCount;

        for(var i = 0; i < Math.abs(difference); i++) {
            if(difference < 0) {
                copyArr.pop();
            } else if(difference > 0) {
                var pushArray = Array(colCount).fill().map(generator);
                copyArr.push(pushArray);
            }
        }

        return copyArr;
    }

    // list int [() => any] -> arr
    // add or substract cols from arr so that the count matches newColCount, if new cols are being added,
    // generate new entries using generator
    function changeColCount(arr, newColCount, generator) {
        let rowCount = arr.length;
        let oldColCount = arr[0].length;
        let copyArr = twoDArrayCopy(arr);
        let difference = newColCount - oldColCount;

        for(var i = 0; i < rowCount; i++) {
            for(var j = 0; j < Math.abs(difference); j++) {
                if(difference < 0) {
                    copyArr[i].pop();
                } else if(difference > 0) {
                    copyArr[i].push(generator());
                }
            }
        }

        return copyArr;
    }

    // list any arr -> arr
    // overwrite the value at arr[indexTrail] with value 
    function changeValFromIndexTrail(indexTrail, value, arr) {
        let index = 0;
        let restrictedArr = arr;

        while(indexTrail[index + 1] != null) {
            restrictedArr = restrictedArr[indexTrail[index]];
            index += 1; 
        }
        restrictedArr[indexTrail[index]] = value;       
    }
    
    // int int [() => any]
    // create a new grid with dimensions (rowCount, colCount) where empty spots are given by generator
    function createGrid(rowCount, colCount, generator) {
        if(colCount == null) {
            return Array(rowCount).fill().map(generator);
        } else {
            return Array(rowCount).fill().map(() => Array(colCount).fill().map(generator));
        }
        
    }

    // string -> any
    // creates a grid square depending on type
    function createGridCellByType(type) {
        if(type === "pixels") {
            return Array(6).fill().map(() => Array(6).fill(0));
        } else if(type === "string") {
            return "";
        }
    }

    
    /*
    helper functions
    */

    function probFromAlt(alt) {
        let prob;
        if(typeof alt === "undefined") {
            prob = {...problem};
        } else {
            prob = alt;
        }

        return prob;
    }

    // list -> list
    // populates an indexTrail with null values with default values
    function populateIndexTrail(indexTrail) {
        if(indexTrail[1] == null) {
            indexTrail[1] = 0;
        } 
        if(indexTrail[2] == null) {
            indexTrail[2] = indexTrail[0] === "context" ? null : "stimulus";
        }

        return indexTrail;
    }

    // int -> int
    // returns number if it is in bounds, otherwise, returns the closest value to number
    // within the bounds
    function applyBounds(number) {
        if(number < 1) {
            number = 1;
        } else if(number > 30) {
            number = 30;
        }

        return number;
    }

    /*
    synthesizers: STATE-DEPENDENT. Generates some output based on a combination of state variables
    e.g. JSON file representing problem, or a set of InputGrids to edit the problem 
    */

    function makeARCJson() {
        let ARCJson = {"train": [], "test": []}
        let examples = problem["context"][0]

        for(let row_index in examples) {
            let row = examples[row_index];
            let prob = {"input": row[0], "output": row[1]};
            ARCJson["train"].push(prob);
        }

        for(let q_index in problem["questions"]) {
            let question = problem["questions"][q_index]
            let prob = {
                        "input": question["stimulus"][0][0], 
                        "output": question["answer"][0]
            };
            ARCJson["test"].push(prob);
        }

        return ARCJson;  
    }

    function exportJSON() {
        let file = {}
        let grid;
        let rows;
        let cols;
        let items;

        if(problemCat === "arc") {
            file = makeARCJson()
        } else {
            file["category"] = problemCat;
            file["id"] = problemId;
            file["context"] = [];
            file["mode"] = multipleChoice ? "discriminate" : "generate";
            file["answer_type"] = "categorical_list";

            for(let gridIndex in problem["context"]) {
                grid = problem["context"][gridIndex];
                rows = grid.length;
                cols = grid[0].length;
                items = grid.flat()
                file["context"].push({"rows": rows, "cols": cols, "type": "categorical_list", "items": items});
            }
            file["questions"] = [];
            let stimulus;
            let choices;
            let answer;
            for(let gridIndex in problem["questions"]) {
                stimulus = problem["questions"][gridIndex]["stimulus"];
                rows = stimulus.length;
                cols = stimulus[0].length;
                items = stimulus.flat();
                choices = multipleChoice ? problem["questions"][gridIndex]["answer"] : [];
                answer = multipleChoice ? problem["questions"][gridIndex]["correct"] : problem["questions"][gridIndex]["answer"][0];

                file["questions"].push({"stimulus": {"rows": rows, "cols": cols, "items": items, "type": "categorical_list"},
                                        "choices": choices,
                                        "answer": answer})
            }
        }

        const json = JSON.stringify(file);
        const blob = new Blob([json],{type:'application/json'});

        const href = URL.createObjectURL(blob);

        saveAs(href);

        /*
        const link = document.createElement('a');
        link.href = href;
        link.download = "problem.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        */
    }
    /*
    <label>
        ID:
        <input type="text" value={problemId} onChange={(e) => setProblemId(e.target.value)} /> 
    </label>
    */
    return (
        <div id="editor" ref={componentRef}>
            <h1>ARC Editor</h1>
            <p>{false && JSON.stringify(problem)}</p>
            <h2>Problem data</h2>
            <div id="options">
                <label>
                    Category:
                    <SelectList id="category" options={Object.keys(lockedVariables)} selection={problemCat} onChange={handleCatChange}/>
                    
                </label>
                
                {
                    !("defaultGridType" in lockedVariables[problemCat]) &&
                    <label>
                        Default grid cell type:
                        <SelectList id="gridCellType" options={["pixels", "string"]} selection={defaultGridType} onChange={handleDefaultGridTypeChange}/>
                    </label>   
                }
            </div>
            <FileUpload handleChange={handleFileUpload} />
            <button onClick={setDefaultProblem}>Clear</button>
            <div id="options" className="addPadding">
                {
                    !("contextLength" in lockedVariables[problemCat]) &&
                    <NumberInput name="# Context" value={problem["context"].length} onChange={handleContextLengthChange} />
                }
                {
                    (!["arc", "letter-string", "bongard"].includes(problemCat)) &&
                    <NumberInput name="# Questions" value={problem["questions"].length} onChange={handleQuestionLengthChange} />
                }
                
            </div>
            <GridMenus 
                indexTrail={currentItemIndexTrail} 
                setIndexTrail={setIndexTrail} 
                problemCat={problemCat} 
                gridType={calcGridType(calcValFromIndexTrail(currentItemIndexTrail, problem))}
                problem={problem}
                setPenColor={setPenColor}
                penColor={penColor}   
            />
            <div>
                {
                    !("multipleChoice" in lockedVariables[problemCat]) &&
                    <label>
                        <input
                        id="multipleChoice"
                        type="checkbox"
                        checked={multipleChoice}
                        onChange={handleMultChoiceChange}
                        />
                        Multiple Choice
                    </label>
                }
            </div>
            <div>
                <GridViewer
                    problemCat={problemCat}
                    problem={problem}
                    currentItemIndexTrail={currentItemIndexTrail}
                    calcStage={calcStage}
                    calcGridType={calcGridType}
                    lockedVariables={lockedVariables[problemCat]}
                    handleGridTypeChange={handleGridTypeChange}
                    handleAnswerLengthChange={handleAnswerLengthChange}
                    handleQuestionLengthChange={handleQuestionLengthChange}
                    handleCorrectAnswer={handleCorrectAnswer}
                    getCorrectAnswer={getCorrectAnswer}
                    multipleChoice={multipleChoice}
                    handleGridRowChange={handleGridRowChange}
                    handleGridColChange={handleGridColChange}
                    handleSceneRowChange={handleSceneRowChange}
                    handleSceneColChange={handleSceneColChange}
                    penColor={penColor}
                    setPixelColor={setPixelColor}
                    setString={setString}
                    setDestToSource={setDestToSource}
                    swapAandB={swapAandB}
                />
                <button onClick={exportJSON} className="button">Export JSON</button>
                <button onClick={() => exportComponentAsPNG(componentRef)}>Export As PNG</button>
            </div>
        </div>
    );
}

function FileUpload(props) {
    const {handleChange} = props;
    return (
        <div>
            <h3>Upload problem file</h3>
            <input type="file" onChange={handleChange} />
        </div>
    );

}

export function GridViewer(props) {
    const { problemCat, problem, currentItemIndexTrail, calcStage, calcGridType, lockedVariables, 
            handleGridTypeChange, handleAnswerLengthChange, handleQuestionLengthChange, handleCorrectAnswer, getCorrectAnswer, multipleChoice,
            handleGridRowChange, handleGridColChange, handleSceneRowChange, handleSceneColChange, 
            penColor, setPixelColor, setString, setDestToSource, swapAandB } = props;
    
    function bongardLayout() {
        let leftIndexTrails = [["context", 0]];
        let rightIndexTrails = [["context", 1]];
        let bottomIndexTrails = [];

        for(let gridIndex in problem["questions"]) {
            bottomIndexTrails.push(["questions", gridIndex, "stimulus"]);
        }

        let [leftSide, rightSide, bottomSide] = panelsFromIndexTrailLists([leftIndexTrails, rightIndexTrails, bottomIndexTrails]);

        return (
            <div>
                <div className="flex-container">
                <div>
                    <h3>Category 1</h3>
                    {leftSide}
                </div>
                <div>
                    <h3>Category 2</h3>
                    {rightSide}
                </div>
                </div>
                <NumberInput name="# Tests" value={problem["questions"].length} onChange={handleQuestionLengthChange} />
                <div className="flex-container">
                    {bottomSide}
                </div>
            </div> 
        );
    }

    function panelsFromIndexTrailLists(indexTrailLists) {
        let allIndexTrails = [];
        let panels = [];
        for(let i in indexTrailLists) {
            allIndexTrails = allIndexTrails.concat(indexTrailLists[i]);
            panels.push([]);
        }

        for(let i = 0; i < allIndexTrails.length; i++) {
            let indexTrail = allIndexTrails[i];

            let activePanel;
            for(let j = 0; j < indexTrailLists.length; j++) {
                if(indexTrailLists[j].includes(indexTrail)) {
                    activePanel = panels[j];
                }
            }

            let grid = calcValFromIndexTrail(indexTrail, problem);
            
            let answerIndexTrail = [indexTrail[0], indexTrail[1], "answer"]
            activePanel.push(
                <InputGrid
                    problemCat={problemCat}
                    grid={grid}
                    contextRows={problem["context"][0].length}
                    testRows={problem["questions"].length}
                    indexTrail={indexTrail}
                    setDestToSource={(srcIT, dstIT) => setDestToSource(srcIT, dstIT)}
                    swapAandB={(a, b) => swapAandB(a, b)}
                    stage={calcStage(indexTrail)}
                    type={calcGridType(grid)}
                    lockedVariables={lockedVariables}
                    handleGridTypeChange={(evt) => handleGridTypeChange(indexTrail, evt)}
                    handleGridRowChange={(e) => handleGridRowChange(indexTrail, e)}
                    handleGridColChange={(e) => handleGridColChange(indexTrail, e)}
                    handleAnswerLengthChange={(e) => handleAnswerLengthChange(indexTrail, e)}
                    correctAnswer={getCorrectAnswer(indexTrail)} 
                    setCorrectAnswer={(idx) => handleCorrectAnswer(answerIndexTrail, idx)} 
                    multipleChoice={multipleChoice} 
                    handleSceneColChange={(e, r, c) => handleSceneColChange(indexTrail, r, c, e)} 
                    handleSceneRowChange={(e, r, c) => handleSceneRowChange(indexTrail, r, c, e)}
                    penColor={penColor}
                    setPixelColor={(color, sr, sc, gr, gc) => setPixelColor(indexTrail, color, sr, sc, gr, gc)} 
                    setString={(str, gr, gc) => setString(indexTrail, str, gr, gc)}
                />
            );
        }

        return panels;
    }

    function arcLayout() {
        let leftSide = [];
        let rightSide = [];
        let leftIndexTrails = [["context", 0]]
        let rightIndexTrails = [];
        
        for(let gridIndex in problem["questions"]) {
            rightIndexTrails.push(["questions", gridIndex, "stimulus"]);
            rightIndexTrails.push(["questions", gridIndex, "answer"]);
        }

        [leftSide, rightSide] = panelsFromIndexTrailLists([leftIndexTrails, rightIndexTrails]);

    
        let modifiedRightSide = [];
        for(let i = 0; i < rightSide.length; i = i + 2) {
            modifiedRightSide.push(
                <div className="flex-container">
                    {[rightSide[i], rightSide[i + 1]]}
                </div>
            )
        }

        return (
            <div className="flex-container">
                <div>
                    <h3>Demonstrations</h3>
                    {leftSide}
                </div>
                <div>
                    <h3>Tests</h3>
                    <NumberInput name="# Tests" value={problem["questions"].length} onChange={handleQuestionLengthChange} />
                    {modifiedRightSide}
                </div>
            </div>
        );  

    }

    function makeInputGrids() {
        if(problemCat === "arc") {
            return arcLayout();
        } else if(problemCat === "bongard") {
            return bongardLayout();
        }  else if(problemCat === "letter-string") {
            return arcLayout();
        } else {
            let inputGrids = [];
            let grid = calcValFromIndexTrail(currentItemIndexTrail, problem);
            inputGrids.push(<InputGrid 
                problemCat={problemCat}
                grid={grid}
                indexTrail={currentItemIndexTrail}
                stage={calcStage(currentItemIndexTrail)}
                type={calcGridType(grid)}
                lockedVariables={lockedVariables}
                handleGridTypeChange={(val) => handleGridTypeChange(currentItemIndexTrail, val)}
                handleGridRowChange={(e) => handleGridRowChange(currentItemIndexTrail, e)}
                handleGridColChange={(e) => handleGridColChange(currentItemIndexTrail, e)}
                handleAnswerLengthChange={(e) => handleAnswerLengthChange(currentItemIndexTrail, e)}
                correctAnswer={getCorrectAnswer(currentItemIndexTrail)} 
                setCorrectAnswer={(idx) => handleCorrectAnswer(currentItemIndexTrail, idx)} 
                multipleChoice={multipleChoice} 
                handleSceneColChange={(e, r, c) => handleSceneColChange(currentItemIndexTrail, r, c, e)} 
                handleSceneRowChange={(e, r, c) => handleSceneRowChange(currentItemIndexTrail, r, c, e)}
                penColor={penColor}
                setPixelColor={(color, sr, sc, gr, gc) => setPixelColor(currentItemIndexTrail, color, sr, sc, gr, gc)} 
                setString={(str, gr, gc) => setString(currentItemIndexTrail, str, gr, gc)}
            />);

            return <div className="flex-container">{inputGrids}</div>;
        }
    }

    return (
        <div>
            {makeInputGrids()}
        </div>
    );
}

export function GridMenus(props) {
    const {indexTrail, setIndexTrail, problemCat, gridType, problem, penColor, setPenColor} = props;

    function generateIndexTrailSelectLists(indexTrail) {
        let selectLists = [];

        selectLists.push(<SelectList id="type" key={0} options={["context", "questions"]} selection={indexTrail[0]} onChange={(e) => setIndexTrail(0, e.target.value)} />);

        let maxIndex = problem[indexTrail[0]].length;

        let options = [...Array(maxIndex).keys()];

        selectLists.push(<SelectList id="parentIndex" key={1} options={options} selection={indexTrail[1]} onChange={(e) => setIndexTrail(1, e.target.value)} />);

        if(indexTrail[0] === "questions") {
            selectLists.push(<SelectList id="questionPart" key={2} options={["stimulus", "answer"]} selection={indexTrail[2]} onChange={(e) => setIndexTrail(2, e.target.value)} />)
        }
    
        return selectLists;
    }

    return (
        <div>
            <div>

            </div>
            {
                !["arc", "letter-string"].includes(problemCat) && 
                <div className="flex-container">
                    {generateIndexTrailSelectLists(indexTrail)}
                </div>
            }
            
            {
                (gridType === "pixels" || problemCat === "arc") &&
                <div className="addPadding">
                    <CirclePicker 
                        color={penColor} 
                        colors={colors} 
                        onChangeComplete={(color) => setPenColor(color.hex)} 
                        width={colors.length * (circleSize + circleSpacing)} 
                        circleSize={circleSize} 
                        circleSpacing={circleSpacing}
                    />
                </div>
            }
            
            
        </div>
    );
}


export function SelectList(props) {
    const { id, options, selection, onChange } = props;

    let htmlOptions = [];

    for(let index in options) {
        htmlOptions.push(<option key={index} value={options[index]}>{options[index]}</option>)
    }

    return (
        <select id={id} value={selection} onChange={onChange}>
                    {htmlOptions}
        </select>
    )

}