import React, { useState } from 'react';
import "../styles/drawingPanel.scss";
import {CirclePicker} from "react-color";
import { exportComponentAsPNG } from "react-component-export-image";

import Row from "./Row";
import { colors } from './Editor';
import { NumberInput } from './Editor';


let circleSize = 28
let circleSpacing = 14



export default function DrawingPanel(props) {
    const {grid, getSceneFromCoords, changeWidth, changeHeight, inAnswer, correctAnswer, setCorrectAnswer, multipleChoice, setPixelColor } = props;
    const [penColor, setPenColor] = useState(colors[0]);

    function changePenColor(color) {
        setPenColor(color.hex);
    }

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
                        <PixelGrid
                            key={j}
                            changeWidth={(e) => changeWidth(e.target.value, rowIndex, colIndex)}
                            changeHeight={(e) => changeHeight(e.target.value, rowIndex, colIndex)}
                            penColor={penColor}
                            setPixelColor={(newVal, row, col) => setPixelColor(newVal, row, col, rowIndex, colIndex)}
                            pixels={getSceneFromCoords(grid, rowIndex, colIndex)}
                            inAnswer={inAnswer}
                            multipleChoice={multipleChoice}
                            correct={inAnswer && (correctAnswer === rowIndex)}
                            setCorrectAnswer={() => setCorrectAnswer(rowIndex)}
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
            <CirclePicker 
                color={penColor} 
                colors={colors} 
                onChangeComplete={changePenColor} 
                width={colors.length * (circleSize + circleSpacing)} 
                circleSize={circleSize} 
                circleSpacing={circleSpacing}/>
            {generateGrid()}
        </div>     
    );
}

export function PixelGrid(props) {
    const { changeWidth, changeHeight, penColor, setPixelColor, pixels, inAnswer, multipleChoice, correct, setCorrectAnswer} = props;

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
    );
}