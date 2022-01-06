import React, { useState } from 'react';
import "../styles/editor.scss";
import InputGrid from "./DrawingPanel";
import {CirclePicker} from "react-color";

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


export function NumberInput(props) {
    return (
        <div className="option">
            <input
                type="number"
                className="panelInput"
                value={props.value}
                onChange={props.onChange}
            />
            <span>{props.name}</span>
        </div>
    )
}

export default function Editor() {

    const [problemId, setProblemId] = useState("other-0");
    const [problemCat, setProblemCat] = useState("other");
    const [defaultGridType, setDefaultGridType] = useState("pixels");
    const [multipleChoice, setMultipleChoice] = useState(false);
    const [currentItemIndexTrail, setCurrentItemIndexTrail] = useState(["context", 0, null]);
    const [problem, setProblem] = useState({"context": [[[createDefaultGridCell()]]], "questions": [{"stimulus": [[createDefaultGridCell()]], "answer": [createDefaultGridCell()], "correct": 0}]});
    const [penColor, setPenColor] = useState(colors[0]);
    
    const lockedVariables = {
                                "arc": {
                                        "contextLength": 1,
                                        "multipleChoice": false,
                                        "defaultGridType": "pixels",
                                        "context-col": 2, 
                                        "stimulus-col": 1, 
                                        "stimulus-row": 1,
                                        "answer-row": 1, 
                                        "context-gridType": "pixels",
                                        "stimulus-gridType": "pixels",
                                        "answer-gridType": "pixels"
                                    },
                                "bongard": {},
                                "other": {}
                            }

    function setLockedVariables(cat) {
        for(let key in lockedVariables[cat]) {
            let keySplit = key.split("-")
            if(key === "contextLength") {
                changeContextOrQuestionLength(lockedVariables[cat][key], "context");
            } else if(key === "multipleChoice") {
                setMultipleChoice(lockedVariables[cat]["multipleChoice"]);
            } else if(key === "defaultGridType") {
                setDefaultGridType(lockedVariables[cat]["defaultGridType"]);
            } else if(keySplit[0] === "context" && ["row", "col"].includes(keySplit[1])) {
                for(let gridIndex in problem["context"]) {
                    changeRowOrColCount(["context", gridIndex], lockedVariables[cat]["context-" + keySplit[1]], keySplit[1]);
                }
            } else if(["stimulus", "answer"].includes(keySplit[0]) && ["row", "col"].includes(keySplit[0])) {
                for(let gridIndex in problem["questions"]) {
                    changeRowOrColCount(["questions", gridIndex, keySplit[0]], lockedVariables[cat][keySplit[0] + "-" + keySplit[1]], keySplit[1]);
                }
            } else if(keySplit[0] === "context" && keySplit[1] === "gridType") {
                for(let gridIndex in problem["context"]) {
                    console.log("changing context grid type");
                    setGridType(["context", gridIndex], lockedVariables[cat]["context-gridType"]);
                }
            } else if(["stimulus", "answer"].includes(keySplit[0]) && keySplit[1] === "gridType") {
                for(let gridIndex in problem["context"]) {
                    setGridType(["questions", gridIndex, keySplit[0]], lockedVariables[cat][keySplit[0] + "-gridType"]);
                }
            }
        }
    }
    
    function getGridFromIndexTrail(indexTrail, startArray=null) {
        if(startArray == null) {
            startArray = problem;
        }

        let restrictedArr = startArray;
        let index = 0;

        while(indexTrail[index] != null) {
            restrictedArr = restrictedArr[indexTrail[index]];
            index += 1
        }
   
        return restrictedArr;
    }

    function setGridFromIndexTrail(arr, indexTrail, value) {
        let index = 0;
        let restrictedArr = arr;

        while(indexTrail[index + 1] != null) {
            restrictedArr = restrictedArr[indexTrail[index]];
            index += 1; 
        }
        restrictedArr[indexTrail[index]] = value;       
    }

    function getGridType(gridGiven=null) {
        if(gridGiven == null) {
            gridGiven = getGridFromIndexTrail(currentItemIndexTrail);
        }

        let gridElement;
        if(isAnswerGrid(gridGiven)) {
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

    function setGridType(indexTrail, newType) {
        console.log("new grid type", newType);
        let grid = getGridFromIndexTrail(indexTrail);
        let newGrid;

        if(inAnswer(indexTrail)) {
            newGrid = createGrid(grid.length, null, () => createGridCellByType(newType));
            modifyProblemWithNewGrid(indexTrail, newGrid);
        } else {
            newGrid = createGrid(grid.length, grid[0].length, () => createGridCellByType(newType));
            modifyProblemWithNewGrid(indexTrail, newGrid);   
        }
    }

    function handleGridTypeChange(indexTrail, event) {
        let newType = event.target.value;
        if(!isSpecialProblemType(problemCat)) {
            setGridType(indexTrail, newType);
        }
    }

    function createGrid(rowCount, colCount, generator) {
        if(colCount == null) {
            return Array(rowCount).fill().map(generator);
        } else {
            return Array(rowCount).fill().map(() => Array(colCount).fill().map(generator));
        }
        
    }

    function createGridCell(gridGiven=null) {
        if(gridGiven == null) {
            return createDefaultGridCell();
        } else {
            let type = getGridType(gridGiven);
            return createGridCellByType(type);
        }
    }

    function createGridCellByType(type) {
        if(type === "pixels") {
            return Array(6).fill().map(() => Array(6).fill(0));
        } else if(type === "string") {
            return "";
        }
    }

    function createDefaultGridCell() {
        return createGridCellByType(defaultGridType);
    }

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

    function populateIndexTrail(indexTrail) {
        if(indexTrail[1] == null) {
            indexTrail[1] = 0;
        } 
        if(indexTrail[2] == null) {
            indexTrail[2] = indexTrail[0] === "context" ? null : "stimulus";
        }

        return indexTrail;
    }

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

    function modifyProblemWithNewGrid(indexTrail, newGrid) {

        let newProblem =  {...problem};
        setGridFromIndexTrail(newProblem, indexTrail, newGrid);
        setProblem(newProblem);

        return newProblem;
    }

    function changeContextOrQuestionLength(newLength, which) {
        let newArr;

        if(which === "context") {
            newArr = changeArrayLength(problem[which], newLength, () => [[createDefaultGridCell()]]);
        } else if(which === "questions") {
            newArr = changeArrayLength(problem[which], newLength, () => ({"stimulus": [[createDefaultGridCell()]], "answer": [createDefaultGridCell()], "correct": 0}));
        }

        modifyProblemWithNewGrid([which], newArr);
    }

    function changeArrayLength(arr, newLength, generator) {
        let copyArr = [...arr];
        let difference = newLength - copyArr.length;

        for(var i = 0; i < Math.abs(difference); i++) {
            if(difference < 0) {
                copyArr.pop();
            } else if(difference > 0) {
                copyArr.push(generator());
            }
        }

        return copyArr;
        
    }

    function isSpecialProblemType(cat) {
        return (cat === "arc");
    }

    function handleMultChoiceCheckbox() {
        if("multipleChoice" in lockedVariables[problemCat]) {
            setMultipleChoice(lockedVariables[problemCat]["multipleChoice"]);
        } else {
            setMultipleChoice(!multipleChoice);
        }
    }

    function handleCatChange(event) {
        let newCat = event.target.value;

        setLockedVariables(newCat);

        setProblemCat(newCat);
    }

    function handleDefaultGridTypeChange(event) {
        let newGridType = event.target.value;

        if(!isSpecialProblemType(problemCat)) {
            setDefaultGridType(newGridType);
        }
    }

    function handleContextNumberChange(event) {
        let newNumber = parseInt(event.target.value);

        if(!isSpecialProblemType(problemCat)) {
            changeContextOrQuestionLength(newNumber, "context");
        }
    }

    function handleQuestionNumberChange(event) {
        let newNumber = parseInt(event.target.value);
        changeContextOrQuestionLength(newNumber, "questions");

    }

    function applyBounds(number) {
        if(number < 1) {
            number = 1;
        } else if(number > 30) {
            number = 30;
        }

        return number;
    }

    function handleChangeRowCount(indexTrail, event) {
        let newCount = applyBounds(parseInt(event.target.value));
        let stage = getStage(indexTrail);
        if(!(stage + "-row" in lockedVariables[problemCat])) {
            changeRowOrColCount(indexTrail, newCount, "row");
        }
    }

    function handleChangeColCount(indexTrail, event) {
        let newCount = applyBounds(parseInt(event.target.value));
        let stage = getStage(indexTrail);
        if(!(stage + "-col" in lockedVariables[problemCat])) {
            changeRowOrColCount(indexTrail, newCount, "col");
        }
        
    }
    
    function changeRowOrColCount(indexTrail, newCount, axis) {
        let grid = getGridFromIndexTrail(indexTrail);

        if(newCount > 1 && inAnswer(indexTrail) && !multipleChoice) {
            setMultipleChoice(true);
        }

        let copyArr;
        if(inAnswer(indexTrail)) {
            copyArr = changeArrayLength(grid, newCount, () => createGridCell(grid));
        } else {
            if(axis === "row") {
                copyArr = addRowsToStateArray(grid, newCount, () => createGridCell(grid));
            } else if(axis === "col") {
                copyArr = addColsToStateArray(grid, newCount, () => createGridCell(grid));
            }
        }

        modifyProblemWithNewGrid(indexTrail, copyArr);
    }

    function addRowsToStateArray(arr, newRowCount, generator) {
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

    function addColsToStateArray(arr, newColCount, generator) {
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

    function getCellFromCoords(grid, r, c) {

        if(c == null) {
            return grid[r];
        }
        else {
            return grid[r][c];
        }
    }

    function setCellFromCoords(grid, scene, r, c) {
        if(c == null) {
            grid[r] = scene;
        }
        else {
            grid[r][c] = scene;
        }
    }

    function changeWidth(indexTrail, widthString, r, c) {
        let grid = getGridFromIndexTrail(currentItemIndexTrail);
        let width = parseInt(widthString);
        let copyArr = addColsToStateArray(getCellFromCoords(grid, r, c), width, () => 0);
        copyArr = copyArr.map(row => row.map(x => x ?? 0));

        let copyGrid = [...grid]; 

        setCellFromCoords(copyGrid, copyArr, r, c);

        modifyProblemWithNewGrid(currentItemIndexTrail, copyGrid);
    }

    function changeHeight(indexTrail, heightString, r, c) {
        let grid = getGridFromIndexTrail(currentItemIndexTrail);
        let height = parseInt(heightString);
        let copyArr = addRowsToStateArray(getCellFromCoords(grid, r, c), height, () => 0);

        let copyGrid = [...grid];
        setCellFromCoords(copyGrid, copyArr, r, c);
        
        modifyProblemWithNewGrid(currentItemIndexTrail, copyGrid);
    }

    function setString(indexTrail, newVal, gridRow, gridCol) {
        let grid = getGridFromIndexTrail(indexTrail);
        let copyGrid = [...grid];
        setCellFromCoords(copyGrid, newVal, gridRow, gridCol);

        modifyProblemWithNewGrid(indexTrail, copyGrid);
    }

    function setPixelColor(indexTrail, new_val, sceneRow, sceneCol, gridRow, gridCol) {
        let grid = getGridFromIndexTrail(indexTrail);
        let newArray = replaceItemsWithoutMutating(getCellFromCoords(grid, gridRow, gridCol), sceneRow, sceneCol, new_val);
        let copyGrid = [...grid];
        setCellFromCoords(copyGrid, newArray, gridRow, gridCol);

        modifyProblemWithNewGrid(indexTrail, copyGrid);
    }

    function isAnswerGrid(grid) {
        let restrictedArr = grid;
        let dimCounter = 0;
        while(restrictedArr.constructor === Array) {
            restrictedArr = restrictedArr[0]
            dimCounter += 1;
        }
        return (dimCounter % 2 === 1);
    }
    function inAnswer(indexTrail) {
        return indexTrail.includes("answer");
    }

    function getCorrectAnswer() {
        if(currentItemIndexTrail.includes("questions")) {
            return problem[currentItemIndexTrail[0]][currentItemIndexTrail[1]]["correct"];
        } else {
            return null;
        }
    }

    function setCorrectAnswer(value) {
        if(currentItemIndexTrail.includes("questions")) {
            let newProblem = {...problem};
            newProblem[currentItemIndexTrail[0]][currentItemIndexTrail[1]]["correct"] = value;
            setProblem(newProblem);
            return true;
        } else {
            return false;
        }
    }

    function exportJSON() {
        let file = {}
        let grid;
        let rows;
        let cols;
        let items;

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
        
        const json = JSON.stringify(file);
        const blob = new Blob([json],{type:'application/json'});

        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = "problem.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function getStage(indexTrail) {
        if(indexTrail.includes("context")) {
            return "context";
        } else if(indexTrail.includes("stimulus")) {
            return "stimulus";
        } else if(indexTrail.includes("answer")) {
            return "answer";
        }
    }

    function makeInputGrids() {
        
        if(isSpecialProblemType(problemCat)) {
            let inputGridsLeft = [];
            let inputGridsRight = [];
            let indexTrails = [["context", 0]]
            
            for(let gridIndex in problem["questions"]) {
                indexTrails.push(["questions", gridIndex, "stimulus"]);
                indexTrails.push(["questions", gridIndex, "answer"]);
            }

            for(let i = 0; i < indexTrails.length; i++) {
                let indexTrail = indexTrails[i];
                let activeInputGrid = indexTrail[0] === "context" ? inputGridsLeft : inputGridsRight;
                let grid = getGridFromIndexTrail(indexTrail);
                activeInputGrid.push(
                    <InputGrid 
                        grid={grid}
                        stage={getStage(indexTrail)}
                        type={getGridType(grid)}
                        lockedVariables={lockedVariables[problemCat]}
                        handleGridTypeChange={(evt) => handleGridTypeChange(indexTrail, evt)}
                        handleChangeRowCount={(e) => handleChangeRowCount(indexTrail, e)}
                        handleChangeColCount={(e) => handleChangeColCount(indexTrail, e)}
                        getCellFromCoords={getCellFromCoords}
                        inAnswer={inAnswer(indexTrail)} 
                        correctAnswer={getCorrectAnswer()} 
                        setCorrectAnswer={setCorrectAnswer} 
                        multipleChoice={multipleChoice} 
                        changeWidth={(ws, r, c) => changeWidth(indexTrail, ws, r, c)} 
                        changeHeight={(hs, r, c) => changeHeight(indexTrail, hs, r, c)}
                        penColor={penColor}
                        setPixelColor={(color, sr, sc, gr, gc) => setPixelColor(indexTrail, color, sr, sc, gr, gc)} 
                        setString={(str, gr, gc) => setString(indexTrail, str, gr, gc)}
                    />
                );
            }

            let modifiedInputGridsRight = [];

            for(let i = 0; i < inputGridsRight.length; i = i + 2) {
                modifiedInputGridsRight.push(
                    <div className="flex-container">
                        {[inputGridsRight[i], inputGridsRight[i + 1]]}
                    </div>
                )
            } 

            return (
                <div className="flex-container">
                    <div>
                        {inputGridsLeft}
                    </div>
                    <div>
                        {modifiedInputGridsRight}
                    </div>
                </div>
            );  
        } else {
            let inputGrids = [];
            let grid = getGridFromIndexTrail(currentItemIndexTrail);
            inputGrids.push(<InputGrid 
                grid={grid}
                stage={getStage(currentItemIndexTrail)}
                type={getGridType(grid)}
                lockedVariables={lockedVariables[problemCat]}
                handleGridTypeChange={(val) => handleGridTypeChange(currentItemIndexTrail, val)}
                handleChangeRowCount={(e) => handleChangeRowCount(currentItemIndexTrail, e)}
                handleChangeColCount={(e) => handleChangeColCount(currentItemIndexTrail, e)}
                getCellFromCoords={getCellFromCoords}
                inAnswer={inAnswer(currentItemIndexTrail)} 
                correctAnswer={getCorrectAnswer()} 
                setCorrectAnswer={setCorrectAnswer} 
                multipleChoice={multipleChoice} 
                changeWidth={(ws, r, c) => changeWidth(currentItemIndexTrail, ws, r, c)} 
                changeHeight={(hs, r, c) => changeHeight(currentItemIndexTrail, hs, r, c)}
                penColor={penColor}
                setPixelColor={(color, sr, sc, gr, gc) => setPixelColor(currentItemIndexTrail, color, sr, sc, gr, gc)} 
                setString={(str, gr, gc) => setString(currentItemIndexTrail, str, gr, gc)}
            />);

            return <div className="flex-container">{inputGrids}</div>;
        }
        
    }

    console.log(problem)
    return (
        <div id="editor">
            <h1>ARC Editor</h1>
            <h2>Problem data</h2>
            <div id="options">
                <label>
                    Category:
                    <SelectList id="category" options={["bongard", "arc", "other"]} selection={problemCat} onChange={handleCatChange}/>
                    
                </label>
                <label>
                    ID:
                    <input type="text" value={problemId} onChange={(e) => setProblemId(e.target.value)} /> 
                </label>
                {
                    !("defaultGridType" in lockedVariables[problemCat]) &&
                    <label>
                        Default grid cell type:
                        <SelectList id="gridCellType" options={["pixels", "string"]} selection={defaultGridType} onChange={handleDefaultGridTypeChange}/>
                    </label>   
                }
            </div>
            <h2>Context and Questions</h2>
            <div id="options">
                {
                    !("contextLength" in lockedVariables[problemCat]) &&
                    <NumberInput name="# Context" value={problem["context"].length} onChange={handleContextNumberChange} />
                }
                <NumberInput name="# Questions" value={problem["questions"].length} onChange={handleQuestionNumberChange} />
            </div>
            <div>
                {
                    !("multipleChoice" in lockedVariables[problemCat]) &&
                    <label>
                        <input
                        id="multipleChoice"
                        type="checkbox"
                        checked={multipleChoice}
                        onChange={handleMultChoiceCheckbox}
                        />
                        Multiple Choice
                    </label>
                }
            </div>
            <div>
                {!isSpecialProblemType(problemCat) &&
                    <div className="option">
                        {generateIndexTrailSelectLists(currentItemIndexTrail)}
                    </div>
                }
                {(getGridType((getGridFromIndexTrail(currentItemIndexTrail))) === "pixels" || isSpecialProblemType(problemCat)) &&
                    <CirclePicker 
                        color={penColor} 
                        colors={colors} 
                        onChangeComplete={(color) => setPenColor(color.hex)} 
                        width={colors.length * (circleSize + circleSpacing)} 
                        circleSize={circleSize} 
                        circleSpacing={circleSpacing}
                    />
                }
                {makeInputGrids()}
                <button onClick={exportJSON} className="button">Export JSON</button>
            </div>
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