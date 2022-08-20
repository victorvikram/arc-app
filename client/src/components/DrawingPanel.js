import React, { useState } from 'react';
import "../styles/drawingPanel.scss";
import { exportComponentAsPNG } from "react-component-export-image";

import Row from "./Row";
import { colors } from './Editor';
import { NumberInput, SelectList, calcValFromIndexTrail } from './Editor';






export default function InputGrid(props) {
    const {problemCat, grid, setDestToSource, contextRows, testRows, swapAandB, indexTrail, stage, type, lockedVariables, handleGridTypeChange, handleGridRowChange, handleGridColChange, handleAnswerLengthChange, correctAnswer, setCorrectAnswer, multipleChoice, penColor, setPixelColor, handleSceneRowChange, handleSceneColChange, setString} = props;
    function univSwapRows(rowIndex) {

        if(stage === "context") {
            let currRowIndexTrail = [...indexTrail];
            currRowIndexTrail.push(rowIndex);
            let nextRowIndexTrail = [...indexTrail];
            nextRowIndexTrail.push(rowIndex + 1);
            swapAandB(currRowIndexTrail, nextRowIndexTrail)
        }
        else if(stage === "answer" || stage === "stimulus") {
            let currRowIndexTrail = [...indexTrail];
            let nextRowIndexTrail = [...indexTrail];
            nextRowIndexTrail[1] = + (( +nextRowIndexTrail[1]) + 1);
            swapAandB(currRowIndexTrail, nextRowIndexTrail);

            
            let alt = stage === "stimulus" ? "answer" : "stimulus";
            let currAltIndexTrail = [indexTrail[0], indexTrail[1], alt];
            let nextAltIndexTrail = [indexTrail[0], (+ (+ indexTrail[1]) + 1), alt];
            swapAandB(currAltIndexTrail, nextAltIndexTrail);
            
        } 
    }
    function generateGrid() {
        let useGrid;
        if(stage === "answer") {
            useGrid = makeInto2dArray(grid);
        } else {
            useGrid = grid;
        }
        
        let rows = [];
        for(let i = 0; i < useGrid.length; i++) {

            let columns = [];
            for(let j = 0; j < useGrid[0].length; j++) {
                let rowIndex = stage === "answer" ? i * 3 + j : i;
                let colIndex = stage === "answer" ? null : j;

                console.log(correctAnswer, rowIndex);
                
                let answerChangeFunc;
                if(problemCat === "bongard") {
                    answerChangeFunc = setCorrectAnswer
                } else {
                    answerChangeFunc = () => setCorrectAnswer(rowIndex);
                }
                
                let fullCurrIndexTrail = indexTrail.concat([rowIndex, colIndex]);
                let fullCounterpartIndexTrail;
                let lastRow;

                if(stage === "context") {
                    fullCounterpartIndexTrail = indexTrail.concat([rowIndex, (+ !colIndex)]);
                    lastRow = (rowIndex === (contextRows - 1));
                }
                else if (stage === "stimulus") {
                    fullCounterpartIndexTrail = [indexTrail[0], indexTrail[1], "answer", 0];
                    lastRow = (+ indexTrail[1]) === (testRows - 1);
                }
                else if (stage === "answer") {
                    fullCounterpartIndexTrail = [indexTrail[0], indexTrail[1], "stimulus", 0, 0];
                    lastRow = (+ indexTrail[1]) === (testRows - 1);
                }



                if(useGrid[i][j] != null) {
                    columns.push(
                        <GridCell
                            key={j}
                            type={type}
                            copyToCounterpart={() => setDestToSource(fullCurrIndexTrail, fullCounterpartIndexTrail)}
                            displaySwap={!lastRow && stage !== "answer" && colIndex % 2 === 0}
                            swapWithNext={() => univSwapRows(rowIndex)}
                            content={calcValFromIndexTrail([rowIndex, colIndex], grid)}
                            stage={stage}
                            multipleChoice={multipleChoice}
                            correct={stage === "answer" && (correctAnswer === rowIndex)}
                            setCorrectAnswer={answerChangeFunc}
                            changeWidth={(e) => handleSceneColChange(e, rowIndex, colIndex)}
                            changeHeight={(e) => handleSceneRowChange(e, rowIndex, colIndex)}
                            penColor={penColor}
                            setPixelColor={(newVal, row, col) => setPixelColor(newVal, row, col, rowIndex, colIndex)}
                            setString={(newVal) => setString(newVal, rowIndex, colIndex)}
                            problemCat={problemCat}
                        />);
                }
            }
            
            rows.push(<div key={i} className="flex-container">{columns}</div>);
        }
        return rows;
    }

    function makeInto2dArray() {
        let newArray = [];

        for(let i = 0; i < Math.ceil(grid.length / 3); i++) {
            newArray.push([]);
            for(let j = 0; j < 3; j++) {
                let scene = grid[i * 3 + j];
                newArray[i].push(scene);
            }
        }

        return newArray;
    }

    console.log(stage);
    console.log(lockedVariables);
    return (
        <div>
            <div id="options">
                {
                    !((stage + "-gridType") in lockedVariables) &&
                    <SelectList id={stage + "-gridType"} options={["pixels", "string"]} selection={type} onChange={handleGridTypeChange}/>
                }
                {  
                    stage === "answer" && !("answer-choice" in lockedVariables) &&
                    <NumberInput id={"answer-choice"} name="# Choices" value={grid.length} onChange={handleAnswerLengthChange} />
                }
                {  
                     !(stage === "answer") && !((stage + "-row") in lockedVariables) && problemCat !== "arc" &&
                    <NumberInput id={stage + "-row"} name="# Rows" value={grid.length} onChange={handleGridRowChange} />
                }
                {  
                     !(stage === "answer") && !((stage + "-row") in lockedVariables) && problemCat === "arc" &&
                    <NumberInput id={stage + "-row"} name="# Demonstrations" value={grid.length} onChange={handleGridRowChange} />
                }
                {
                    !(stage === "answer") && !((stage + "-col") in lockedVariables) &&
                    <NumberInput id={stage + "-col"} name="# Cols" value={grid[0].length} onChange={handleGridColChange} />
                }
            </div>
            {generateGrid()}
        </div>     
    );
}

export function GridCell(props) {
    const { type, content, copyToCounterpart, swapWithNext, displaySwap, stage, multipleChoice, correct, setCorrectAnswer, changeWidth, changeHeight, penColor, setPixelColor, setString, problemCat} = props;

    return (
        <div>
            {type === "pixels" &&
                <PixelEditor 
                    pixels={content}
                    changeHeight={changeHeight}
                    changeWidth={changeWidth}
                    penColor={penColor}
                    setPixelColor={setPixelColor}
                />
            }
            {type === "string" &&
                    <TextEditor 
                        string={content}
                        setString={setString}
                    />
            }
            {stage === "stimulus" && (problemCat === "bongard") &&
                <div>
                    <SelectList options={["left", "right", "neither"]} selection={["left", "right", "neither"][correct]} onChange={(e) => setCorrectAnswer(["left", "right", "neither"].indexOf(e.target.value))} />
                </div>
            }
            {(problemCat === "arc") && 
                <div>
                    <button onClick={copyToCounterpart}> Copy to counterpart</button>
                </div>
            }
            {(problemCat === "arc") && displaySwap && 
                <div>
                    <button onClick={swapWithNext}>Swap with next</button>
                </div>
            }
            {stage === "answer" && multipleChoice && !(problemCat !== "bongard") &&
                <div>
                    <label>
                        <input
                        type="checkbox"
                        checked={correct}
                        onChange={setCorrectAnswer}
                        />
                        Correct
                    </label>
                </div>
            }
        </div>
    )
}

export function TextEditor(props) {
    const { string, setString } = props;
    return (
        <div className="flex-child">
            <input type="text" value={string} onChange={(e) => setString(e.target.value)} /> 
        </div>
    )
}

export function PixelEditor(props) {
    const { pixels, changeHeight, changeWidth, penColor, setPixelColor} = props;
    const [dragging, setDragging] = useState(false);
    let componentRef = React.createRef()

    function startDragging(e) {
        e.preventDefault();
        setDragging(true);
    }

    let rows = [];

    for (let i = 0; i < pixels.length; i++) {
        rows.push(<Row key={i} width={pixels[0].length} selectedColor={penColor} dragging={dragging} changeColor={(col, new_val) => setPixelColor(new_val, i, col)} pixelColors={pixels[i]} />);
    }

    return (
        <div className="flex-child">
            <div id="options">
                <NumberInput name="Width" value={pixels[0].length} onChange={changeWidth} />
                <NumberInput name="Height" value={pixels.length} onChange={changeHeight} />
            </div>
            <div 
                id="pixels" 
                onMouseEnter={() => setDragging(false)}
                onMouseLeave={() => setDragging(false)}
                onMouseDown={startDragging} 
                onMouseUp={() => setDragging(false)}>
                {rows}
            </div>
        </div>
    );
}