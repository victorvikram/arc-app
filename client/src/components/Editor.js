import React, { useState } from 'react';
import "../styles/editor.scss";
import InputGrid from "./DrawingPanel";

export const colors = ["#000000", "#0068cf", "#ff3937", "#00c443", "#ffd631", "#a0a0a0", "#f916b1", "#ff7a2c", "#63d6fc", "#820f23"]

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

    const [problemId, setProblemId] = useState("arc-0");
    const [problemCat, setProblemCat] = useState("arc");
    const [defaultGridType, setDefaultGridType] = useState("pixels");
    const [multipleChoice, setMultipleChoice] = useState(false);
    const [currentItemIndexTrail, setCurrentItemIndexTrail] = useState(["context", 0, null]);
    const [problem, setProblem] = useState({"context": [[[createDefaultGridCell()]]], "questions": [{"stimulus": [[createDefaultGridCell()]], "answer": [createDefaultGridCell()], "correct": 0}]});
    const [grid, setGrid] = useState(getGridFromIndexTrail(currentItemIndexTrail));

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
            gridGiven = grid;
        }

        let gridElement;
        if(isAnswerGrid(gridGiven)) {
            gridElement = grid[0];
        } else {
            gridElement = grid[0][0];
        }

        if(typeof gridElement === 'string') {
            return "string";
        } else if(gridElement.constructor === Array) {
            return "pixels";
        }
    }

    function setGridType(newType) {
        if(inAnswer(currentItemIndexTrail)) {
            setGrid(createGrid(grid.length, null, () => createGridCellByType(newType)));
        } else {
            setGrid(createGrid(grid.length, grid[0].length, () => createGridCellByType(newType)));
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

        saveGrid();
        setCurrentItemIndexTrail(newIndexTrail);
        setGrid(getGridFromIndexTrail(newIndexTrail));
    }

    function saveGrid() {
        let newProblem = {...problem};
        setGridFromIndexTrail(newProblem, currentItemIndexTrail, grid);
        setProblem(newProblem);
    }

    function changeContextOrQuestionLength(newLengthString, which) {
        let newLength = parseInt(newLengthString);
        let newArr;
        if(which === "context") {
            newArr = changeArrayLength(problem[which], newLength, () => [[createDefaultGridCell()]]);
        } else if(which === "questions") {
            newArr = changeArrayLength(problem[which], newLength, () => ({"stimulus": [[createDefaultGridCell()]], "answer": [createDefaultGridCell()], "correct": 0}));
        }
        console.log(JSON.stringify(newArr));
        

        let newProblem = {...problem};
        newProblem[which] = newArr;
        setProblem(newProblem);
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
    
    function changeRowOrColCount(e, axis) {
        let newCount = parseInt(e.target.value);

        if(newCount < 1) {
            newCount = 1;
        } else if(newCount > 1 && inAnswer(currentItemIndexTrail) && !multipleChoice) {
            setMultipleChoice(true);
        }

        let copyArr;
        if(inAnswer(currentItemIndexTrail)) {
            copyArr = changeArrayLength(grid, newCount, () => createGridCell(grid));
        } else {
            if(axis === "row") {
                copyArr = addRowsToStateArray(grid, newCount, () => createGridCell(grid));
            } else if(axis === "col") {
                copyArr = addColsToStateArray(grid, newCount, () => createGridCell(grid));
            }
        }

        console.log(copyArr);

        let newProblem = {...problem}

        setGridFromIndexTrail(newProblem, currentItemIndexTrail, copyArr);
        setProblem(newProblem);
        setGrid(getGridFromIndexTrail(currentItemIndexTrail, newProblem));
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

    function changeWidth(widthString, r, c) {
        let width = parseInt(widthString);
        let copyArr = addColsToStateArray(getCellFromCoords(grid, r, c), width, () => 0);
        copyArr = copyArr.map(row => row.map(x => x ?? 0));

        let copyGrid = [...grid]; 

        setCellFromCoords(copyGrid, copyArr, r, c);

        setGrid(copyGrid);
    }

    function changeHeight(heightString, r, c) {
        let height = parseInt(heightString);
        let copyArr = addRowsToStateArray(getCellFromCoords(grid, r, c), height, () => 0);

        let copyGrid = [...grid];
        setCellFromCoords(copyGrid, copyArr, r, c);
        

        setGrid(copyGrid);
    }

    function setString(newVal, gridRow, gridCol) {
        let copyGrid = [...grid];
        setCellFromCoords(copyGrid, newVal, gridRow, gridCol);

        setGrid(copyGrid);
    }

    function setPixelColor(new_val, sceneRow, sceneCol, gridRow, gridCol) {

        let newArray = replaceItemsWithoutMutating(getCellFromCoords(grid, gridRow, gridCol), sceneRow, sceneCol, new_val);

        let copyGrid = [...grid];
        setCellFromCoords(copyGrid, newArray, gridRow, gridCol);

        setGrid(copyGrid); 
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

        saveGrid();

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

    console.log(JSON.stringify(grid));
    console.log(getGridType(grid));

    return (
        <div id="editor">
            <h1>ARC Editor</h1>
            <h2>Problem data</h2>
            <div id="options">
                <label>
                    Category:
                    <SelectList id="category" options={["bongard", "arc"]} selection={problemCat} onChange={(e) => setProblemCat(e.target.value)}/>
                    
                </label>
                <label>
                    ID:
                    <input type="text" value={problemId} onChange={(e) => setProblemId(e.target.value)} /> 
                </label>
                <label>
                    Default grid cell type:
                    <SelectList id="gridCellType" options={["pixels", "string"]} selection={defaultGridType} onChange={(e) => setDefaultGridType(e.target.value)}/>
                </label>
            </div>
            <h2>Context and Questions</h2>
            <div id="options">
                <NumberInput name="# Context" value={problem["context"].length} onChange={(e) => changeContextOrQuestionLength(e.target.value, "context")} />
                <NumberInput name="# Questions" value={problem["questions"].length} onChange={(e) => changeContextOrQuestionLength(e.target.value, "questions")} />
            </div>
            <div>
                <label>
                    <input
                    type="checkbox"
                    checked={multipleChoice}
                    onChange={() => setMultipleChoice(!multipleChoice)}
                    />
                    Multiple Choice
                </label>
            </div>
            <h2>Current Grid Properties</h2>
            <div id="options">
                <SelectList id="gridCellType" options={["pixels", "string"]} selection={getGridType(grid)} onChange={(e) => setGridType(e.target.value)}/>
                <NumberInput name="# Rows" value={getGridFromIndexTrail(currentItemIndexTrail).length} onChange={(e) => changeRowOrColCount(e, "row")} />
                {!currentItemIndexTrail.includes("answer") &&
                <NumberInput name="# Cols" value={getGridFromIndexTrail(currentItemIndexTrail)[0].length} onChange={(e) => changeRowOrColCount(e, "col")} />}
            </div>
            <div>
                <div className="option">
                   {generateIndexTrailSelectLists(currentItemIndexTrail)}
                </div>
                <InputGrid 
                    grid={grid} 
                    type={getGridType(grid[0][0])}
                    getCellFromCoords={getCellFromCoords}
                    inAnswer={inAnswer(currentItemIndexTrail)} 
                    correctAnswer={getCorrectAnswer()} 
                    setCorrectAnswer={setCorrectAnswer} 
                    multipleChoice={multipleChoice} 
                    changeWidth={changeWidth} 
                    changeHeight={changeHeight}
                    setPixelColor={setPixelColor} 
                    setString={setString}
                 />
            </div>
            <button onClick={exportJSON} className="button">Export JSON</button>
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