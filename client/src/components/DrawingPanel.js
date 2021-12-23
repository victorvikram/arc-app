import React, { useState } from 'react';
import "../styles/drawingPanel.scss";
import {CirclePicker} from "react-color";
import { exportComponentAsPNG } from "react-component-export-image";

import Row from "./Row";
import { colors } from './Editor';
import { NumberInput } from './Editor';


let circleSize = 28
let circleSpacing = 14



export default function InputGrid(props) {
    const {grid, type, getCellFromCoords, inAnswer, correctAnswer, setCorrectAnswer, multipleChoice, setPixelColor, changeWidth, changeHeight, setString} = props;
    const [penColor, setPenColor] = useState(colors[0]);

    function generateGrid() {

        let useGrid;
        if(inAnswer) {
            useGrid = makeInto2dArray(grid);
        } else {
            useGrid = grid;
        }
        
        let rows = [];
        for(let i = 0; i < useGrid.length; i++) {

            let columns = [];
            for(let j = 0; j < useGrid[0].length; j++) {
                let rowIndex = inAnswer ? i * 3 + j : i;
                let colIndex = inAnswer ? null : j;
                
                if(useGrid[i][j] != null) {
                    columns.push(
                        <GridCell
                            key={j}
                            type={type}
                            content={getCellFromCoords(grid, rowIndex, colIndex)}
                            inAnswer={inAnswer}
                            multipleChoice={multipleChoice}
                            correct={inAnswer && (correctAnswer === rowIndex)}
                            setCorrectAnswer={() => setCorrectAnswer(rowIndex)}
                            changeWidth={(e) => changeWidth(e.target.value, rowIndex, colIndex)}
                            changeHeight={(e) => changeHeight(e.target.value, rowIndex, colIndex)}
                            penColor={penColor}
                            setPixelColor={(newVal, row, col) => setPixelColor(newVal, row, col, rowIndex, colIndex)}
                            setString={(newVal) => setString(newVal, rowIndex, colIndex)}
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

    return (
        <div id="drawingPanel">
            {type === "pixels" &&
                <CirclePicker 
                    color={penColor} 
                    colors={colors} 
                    onChangeComplete={(color) => setPenColor(color.hex)} 
                    width={colors.length * (circleSize + circleSpacing)} 
                    circleSize={circleSize} 
                    circleSpacing={circleSpacing}
                />
            }
            
            {generateGrid()}
        </div>     
    );
}

export function GridCell(props) {
    const { type, content, inAnswer, multipleChoice, correct, setCorrectAnswer, changeWidth, changeHeight, penColor, setPixelColor, setString} = props;

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
            {inAnswer && multipleChoice &&
                <div>
                    <label>
                        <input
                        type="checkbox"
                        checked={correct}
                        onChange={setCorrectAnswer}
                        />
                        Correct
                    </label>
                </div>}
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