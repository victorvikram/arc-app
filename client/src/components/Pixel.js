import React, { useState } from 'react';
import "../styles/pixel.scss";
import { colors } from './Editor';

export default function Pixel(props) {
    const {selectedColor, dragging, changeColor, pixelColor} = props;
    const [dispPixelColor, setDispPixelColor] = useState(null);

    function applyColor() {
        let new_index = colors.indexOf(selectedColor);
        changeColor(new_index);
        setDispPixelColor(null);
    }

    function changeColorOnMouseEnter() {
        if(dragging) {
            applyColor()
        }
        else {
            setDispPixelColor(selectedColor);
        }
    }

    function resetColor() {
        setDispPixelColor(null);
    }

    var backgroundColor = dispPixelColor == null ? colors[pixelColor] : dispPixelColor;

    return (
        <div 
            className="pixel"
            onMouseDown={applyColor}
            onMouseEnter={changeColorOnMouseEnter} 
            onMouseLeave={resetColor} 
            style={{backgroundColor: backgroundColor }}>
        </div>
    );
    
}