class timeLine {
    /**
     * Class constructor with initial configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data, _data2, _selectBreed, _selectAge, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 1300,
            containerHeight: 200,
            margin: { top: 15, right: 60, bottom: 30, left: 100 },
            tooltipPadding: 15
        }
        this.data = _data;
        this.data2 = _data2;
        this.selectBreed = _selectBreed;
        this.selectAge = _selectAge;
        this.dispatcher = _dispatcher;
        this.initVis();
    }


    initVis() {
        let vis = this;

        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight)
            .append("g")
            .attr("transform",
                "translate(" + vis.config.margin.left + "," + vis.config.margin.top + ")");

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // vis.keys = ["intake", "outcome"]

        vis.xScale = d3.scaleTime()
            .range([0, vis.width]);

        // vis.yScale = d3.scaleLinear()
        //     .range([vis.height, 0]);

        vis.yScaleR = d3.scaleLinear()
            .range([vis.height, 0]);

        // Initialize axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .ticks(12)
            .tickFormat(d => {
                return formatDate(new Date(d))
            });

        vis.yAxisR = d3.axisRight(vis.yScaleR)
            // .tickPadding(10)
            .ticks(5)
            .tickFormat(d3.format("d"));

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // SVG Group containing the actual chart; D3 margin convention
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Append empty x-axis group and move it to the bottom of the chart
        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.height})`);

        vis.yAxisGR = vis.chart.append('g')
            .attr('class', 'axis y-axis')
            .attr("transform", "translate(" + vis.width + " ,+15)");

        // Append both axis titles
        vis.chart.append('text')
            .attr('class', 'timeline-title')
            .attr('y', 0)
            .attr('x', vis.width / 2)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .text('Timeline Filter ');

        // vis.chart.append('text')
        //     .attr('class', 'axis-title')
        //     .attr('x', 0)
        //     .attr('y', 5)
        //     .attr('dy', '.71em')
        //     .text('Net');

        vis.brushG = vis.chart.append('g')
            .attr('class', 'brush x-brush');


        // Initialize brush component

        let selection = [0,0]
        vis.brush = d3.brushX()
            .extent([[0, 0], [vis.width, vis.height]])
            .on('brush', function({selection}) {
                if (selection) {
                    if (selection[0] != selection[1]) {

                        vis.selectedDomain = selection.map(vis.xScale.invert, vis.xScale);
                        vis.dispatcher.call("filterTime", this, vis.selectedDomain);
                    }
                }
                //vis.brushed(selection);
            })
            .on('end', function({selection}) {
                if (!selection) vis.dispatcher.call("filterTime",this, null);
            });


        vis.updateVis()

    }

    updateVis() {
        let vis = this;

        // get intake data group by date


        let groupByDate = d3.group(this.data, g => {
            return g.datetime.substring(0, 7);
        });

        vis.intakeArr = Array.from(groupByDate.entries());
        vis.intakeArr.forEach(e => {
            e[1] = e[1].length
        })

        // get outcome data group by date
        let groupByDate2 = d3.group(this.data2, g => {
            return g.datetime.substring(0, 7);
        });

        vis.outcomeArr = Array.from(groupByDate2.entries());
        vis.outcomeArr.forEach(e => {
            e[1] = e[1].length
        })

        // get net data
        let groupByDate3 = new Map()
        vis.intakeArr.forEach(e => {
            if (groupByDate2.get(e[0]) != null) {
                let cnt = 0;
                for (let k in groupByDate2.get(e[0])) {
                    cnt++;
                }
                let num = e[1] - cnt;
                groupByDate3.set(e[0], [num, e[1], cnt])
            } else {
                groupByDate3.set(e[0], [e[1], e[1], 0])
            }
        })

        vis.outcomeArr.forEach(e => {
            if (groupByDate3.get(e[0]) == null) {
                groupByDate3.set(e[0], [-e[1], 0 , e[1]])
            }
        })


        // const parseTime = d3.timeParse("%Y-%m-%d")
        const parseTime = d3.timeParse("%Y-%m")
        vis.netArr = Array.from(groupByDate3.entries());
        let groupData = [];
        vis.netArr.forEach(e => {
            let intakeNum = e[1][1]
            let outcomeNum = e[1][2]
            groupData.push({
                "key": e[0],
                "values":[{"year": e[0], "name": "outcome", "val": outcomeNum},
                    {"year": e[0], "name": "intake", "val": intakeNum}]
            })
        })

        vis.sortedNet = []
        vis.netArr.forEach(e => {
            vis.sortedNet.push({"year":parseTime(e[0]), "value": e[1]})
        })

        vis.sortedNet.sort(function(a,b){return a.year-b.year})

        vis.xScale.domain([new Date('2013-10-01'), new Date('2018-05-01')]);
        vis.yScaleR.domain([-600, 600]);


        vis.renderVis();
    }


    renderVis() {
        let vis = this;
        const parseTime = d3.timeParse("%Y-%m")

        //Add net line
        vis.netline = vis.chart.append("path")
            .datum(vis.sortedNet)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("d", d3.line()
                .x(function(d) {
                    return vis.xScale(d.year) })
                .y(function(d) { return vis.yScaleR(d.value[0]) })
            )

        // Add label for net line
        vis.chart.append("text")
            .attr("transform", "translate(" + (vis.width - 50) + "," +
                (vis.yScaleR(vis.sortedNet[vis.sortedNet.length - 1].value[0]) + 15) + ")")
            .attr("class", "net-label")
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .style("fill", "black")
            .text("Net");


        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove());

        vis.yAxisGR
            .call(vis.yAxisR)
            .call(g => g.select('.domain').remove())

        const defaultBrushSelection = [0,0];

        vis.brushG
            .call(vis.brush)
            .call(vis.brush.move, defaultBrushSelection);

    }


    // /**
    //  * React to brush events
    //  */
    // brushed(selection) {
    //     let vis = this;
    //
    //     // Check if the brush is still active or if it has been removed
    //     if (selection) {
    //         if (selection[0] != selection[1]) {
    //             vis.selectedDomain = selection.map(vis.xScale.invert, vis.xScale);
    //             vis.dispatcher.call("filterTime", this, vis.selectedDomain);
    //         } else {
    //             vis.dispatcher.call("filterTime",this, null);
    //         }
    //     }
    // }


}



function formatDate(date) {
    let d = new Date(date),
        month = "" + (d.getMonth() + 1),
        day = "" + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [year, month].join("-");
}



