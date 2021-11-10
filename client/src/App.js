import './App.css';
import React from 'react';

class ToggleAnswerButton extends React.Component {
  calculateText() {
    if(this.props.show) {
      return "Hide Answer";
    } else {
      return "Show Answer";
    }
  }

  render() {
    return (
      <button onClick={this.props.onClick}>
        {this.calculateText()}
      </button>
    )
  }
}

class Canvas extends React.Component {
  constructor(props) {
    super(props)
    this.canvasRef = React.createRef()
  }

  drawGrayscale() {
    var width = this.props.data[0].length;
    var height = this.props.data.length;
    var buffer = new Uint8ClampedArray(width * height * 4)

    for(var row = 0; row < height; row++) {
      for(var col = 0; col < width; col++) {
        var pos = (row * width + col) * 4
        buffer[pos] = this.props.data[row][col]
        buffer[pos + 1] = this.props.data[row][col]
        buffer[pos + 2] = this.props.data[row][col]
        buffer[pos + 3] = 255
      }
    }

    const canvas = this.canvasRef.current
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    var imgData = ctx.createImageData(width, height);
    imgData.data.set(buffer)

    ctx.putImageData(imgData, 0, 0)
  }

  drawCategorical() {

    var color_dict = {
      0: "rgb(0, 0, 0)", 
      1: "rgb(0, 105, 207)",
      2: "rgb(255, 57, 55)",
      3: "rgb(0, 197, 67)",
      4: "rgb(255, 215, 49)",
      5: "rgb(160, 160, 160)",
      6: "rgb(249, 22, 179)",
      7: "rgb(255, 122, 44)",
      8: "rgb(99, 214, 252)",
      9: "rgb(130, 15, 35)",
      10:"rgb(255, 255, 255)"
    }
    const canvas = this.canvasRef.current;
    const ctx = canvas.getContext('2d');

    var cw = canvas.width;
    var ch = canvas.height;
    var rows = this.props.data.length;
    var cols = this.props.data[0].length;
    var padding = 1;
    var w = (cw - (padding * cols)) / cols;
    var h = (ch - (padding * rows)) / rows;
    w = Math.min(w, h);

    if(rows !== 1) {
      h = Math.min(w, h);
    }
    

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        ctx.fillStyle = color_dict[this.props.data[row][col]]
        ctx.fillRect(col * (w + padding), row * (h + padding), w, h)
      }
    }
  }

  componentDidUpdate() {
    this.redraw()
  }

  componentDidMount() {
    this.redraw() 
  }

  redraw() {
    if(this.props.type === "grayscale") {
      this.drawGrayscale()
    } else if(this.props.type === "categorical_list") {
      this.drawCategorical()
    }
  }

  render() {
    return <canvas ref={this.canvasRef} {... this.props} />
  }
}

class ProblemViewer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {problem_type: "all", problem_type_choices: [""], problem_name: "", problem_choices: [""], problem_data: {}}
    this.handleProblemTypeChange = this.handleProblemTypeChange.bind(this)
    this.handleProblemChange = this.handleProblemChange.bind(this)
  }

  getProblemTypes() {
    let requestUrl = `/api/categories`
    fetch(requestUrl)
      .then((res) => res.json())
      .then((data) => {
        data.unshift("all");
        this.setState({problem_type: "all", problem_type_choices: data}, (state) => {
          this.getRelevantProblems();
        });
      })
  }

  getRelevantProblems() {
    let url_tail = this.state.problem_type === "all" ? "all" : this.state.problem_type;
    let requestUrl = `/api/${url_tail}`
    fetch(requestUrl)
      .then((res) => res.json())
      .then((data) => {
        data.unshift("");
        var ids = []
        for(var i = 0; i < data.length; i++) {
          ids.push(data[i].id);
        }
        this.setState({problem: "", problem_choices: ids});
      })
  }

  getProblem() {
    if(this.state.problem_name !== "") {
      let requestUrl = `/api/${this.state.problem_type}/${this.state.problem_name}`
      fetch(requestUrl)
        .then((res) => res.json())
        .then((data) => {
          this.setState({problem_data: data});
        })
    }
  }

  componentDidMount() {
    this.getProblemTypes();
  }

  handleProblemTypeChange(event) {
    if(event.target.value !== this.state.problem_type) {
      this.setState({problem_type: event.target.value}, (state) => {
        this.getRelevantProblems()
      });
    } 
  }

  handleProblemChange(event) {
    this.setState({problem_name: event.target.value}, (state) => {
      this.getProblem();
    });
  }

  render() {
    var problem_part;
    var data = this.state.problem_data
    if(data && Object.keys(data).length === 0) {
      problem_part = []
    } else {
      problem_part = (
        <div className='side_by_side'>
          <ContextViewer type={this.state.problem_data.context_type} grids={this.state.problem_data.context}/>
          <TestViewer stimulus_type={this.state.problem_data.stimulus_type} answer_type={this.state.problem_data.answer_type} questions={this.state.problem_data.questions} />
        </div>
      )
    }
    return (
      <div>
        <div className='side_by_side'>
          <SelectList value={this.state.problem_type} options={this.state.problem_type_choices} onChange={this.handleProblemTypeChange} />
          <SelectList value={this.state.problem_name} options={this.state.problem_choices} onChange={this.handleProblemChange} />
        </div>
        {problem_part}
      </div>
    )
  }
}

class QuestionViewer extends React.Component {
  addStimulus(comps) {
    var rows = this.props.data.stimulus.rows;
    var cols = this.props.data.stimulus.cols;
    if(rows > 0 && cols > 0) {
      comps.push(<GridViewer key={0} rows={rows} cols={cols} items={this.props.data.stimulus.items} type={this.props.stimulus_type}/>);
    }
  }

  addChoices(comps) {
    var no_choices = this.props.data.choices.length;
    if(no_choices > 0) {
      var rows = Math.ceil(no_choices / 3);
      var cols = 3
      comps.push(<GridViewer key={1}  rows={rows} cols={cols} items={this.props.data.choices} type={this.props.answer_type} />)
    }
  }
  addAnswer(comps) {
    var answer_type;
    if(this.props.data.choices.length > 0) {
      answer_type = "number";
    } else {
      answer_type = this.props.answer_type;
    }
    comps.push(<AnswerViewer key={2} answer={this.props.data.answer} type={answer_type} />);
  }

  render() {
    var comps = []
    this.addStimulus(comps)
    this.addChoices(comps)
    this.addAnswer(comps)
    return <div>{comps}</div>
  }
}

class AnswerViewer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {show: false, answer: this.props.answer}
    this.onButtonPress = this.onButtonPress.bind(this)
  }

  onButtonPress() {
    this.setState({show: !this.state.show, answer: this.props.answer})
  }

  render() {
    var comps = [<ToggleAnswerButton key={0} onClick={this.onButtonPress} show={this.props.show} />]
    
    // show the answer if the state 
    if(this.state.show && (this.props.answer === this.state.answer)) {
      comps.push(<ContentSquare key={1} type={this.props.type} data={this.props.answer} />)
    }
    else if (this.state.show) {
      this.setState({show: false, answer: this.props.answer})
    }
    else if (this.props.answer !== this.state.answer) {
      this.setState({answer: this.props.answer})
    }

    return (
      <div>{comps}</div>
    )
  }
}

class TestViewer extends React.Component {
  generateQuestionDivs() {
    var questions = []
    for(var i = 0; i < this.props.questions.length; i++) {
      questions.push(<QuestionViewer key={i} data={this.props.questions[i]} answer_type={this.props.answer_type} stimulus_type={this.props.stimulus_type}/>)
    }

    return questions
  }

  render() {
    var questions = this.generateQuestionDivs()
    return (
      <div>{questions}</div>
    )
  }
}

class GridViewer extends React.Component {
  getRelevantData(arr, index) {
    if (index < arr.length) {
      return arr[index]
    }
    else {
      return null
    }
  }

  buildTable() {
    var table = [];
    var row = [];

    for (var i = 0; i < this.props.rows; i++) {
      row = [];
      for (var j = 0; j < this.props.cols; j++) {
        var item_index = i * this.props.cols + j;
        var data = this.getRelevantData(this.props.items, item_index);
        row.push(<td key={item_index}><ContentSquare type={this.props.type} data={data}/></td>);
      }
      table.push(<tr key={i}>{row}</tr>);
    }

    return <table><tbody>{table}</tbody></table>
  }
  render() {
    return <div>{this.buildTable()}</div>;
  }
}

class SelectList extends React.Component {
  makeOptions() {
    var options = []
    for(let ind in this.props.options) {
      options.push(<option key={ind} value={this.props.options[ind]}>{this.props.options[ind]}</option>)
    }
    return options
  }
  render() {
    var options = this.makeOptions();
    return (
      <select value={this.props.value} onChange={this.props.onChange}>
        {options}
      </select>
    )
  }
}

class ContextViewer extends React.Component {
  getTables() {
    var tables = [];
    for(var i = 0; i < this.props.grids.length; i++) {
      tables.push(<GridViewer key={i} rows={this.props.grids[i].rows} cols={this.props.grids[i].cols} items={this.props.grids[i].items} type={this.props.type} />)
    }
    return tables
  }

  render() {
    var tables = this.getTables()
    return (
      <div className='side_by_side'>{tables}</div>
    )
  }
}

class ContentSquare extends React.Component {
  decode() {
    if(this.props.data === null) {
      return ""
    } else if(this.props.type === "string") {
      return this.props.data
    } else if(this.props.type === "grayscale" || this.props.type === "categorical_list") {
      return <Canvas type={this.props.type} data={this.props.data} />
    } else if(this.props.type === "number") {
      return this.props.data
    }
  }

  render() {
    var thing = this.decode()
    return <div>{thing}</div>
  }
}


function App() {
  return (
    <div className="App">
      <ProblemViewer />
    </div>
  );
}

export default App;
