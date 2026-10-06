d3.csv("data/data.csv").then((nodes) => {
  const formatDateLabel = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format;

  const accessors = {
    title: (d) => d["Title"],
    platform: (d) => d["Platform"],
    views: (d) => +d["Views"].slice(0, -1),
    viewsLabel: (d) => d["Views"],
    rank: (d) => +d["Rank"],
    date: (d) => d["Date"],
    dateLabel: (d) => formatDateLabel(new Date(d["Date"])),
  };

  const dates = [...new Set(nodes.map(accessors.date))];
  const ranks = [...new Set(nodes.map(accessors.rank))];
  const links = generateLinks(nodes);

  console.log(links);
  function generateLinks(nodes) {
    const grouped = d3
      .groups(nodes, accessors.title)
      .filter(([_, entries]) => entries.length > 1);
    return grouped.map(([title, entries]) => {
      const points = [];
      const startIndex = dates.indexOf(accessors.date(entries.at(0)));
      const endIndex = dates.indexOf(accessors.date(entries.at(-1)));
      const rankByDate = new Map(
        entries.map((d) => [accessors.date(d), accessors.rank(d)]),
      );

      dates.slice(startIndex, endIndex + 1).forEach((date) => {
        const rank = rankByDate.get(date) || null;
        points.push({
          date,
          rank,
          edge: "start",
        });
        points.push({
          date,
          rank,
          edge: "end",
        });
      });
      return {
        title,
        points: points.slice(1, -1),
      };
    });
  }

  const marginTop = 20;
  const marginRight = 8;
  const marginBottom = 48;
  const marginLeft = 8;
  const columnWidth = 200;
  const columnGap = 80;
  const platformLabelHeight = 12;
  const titleLabelHeight = 14;
  const platformLabelTitleLabelGap = 6;
  const titleLabelBarGap = 8;
  const barHeight = 24;
  const rowGap = 16;
  const rankColumnWidth = 24;
  const barLabelBarGap = 6;

  const strokeWidth = 1;
  const linkWidth = 3;

  const rowHeight =
    platformLabelHeight +
    platformLabelTitleLabelGap +
    titleLabelHeight +
    titleLabelBarGap +
    barHeight;
  const width =
    marginLeft +
    marginRight +
    (columnWidth + columnGap) * dates.length -
    columnGap;
  const height =
    marginTop + marginBottom + (rowHeight + rowGap) * ranks.length - rowGap;

  const x = d3
    .scaleBand()
    .domain(dates)
    .range([marginLeft, width - marginRight])
    .paddingOuter(0)
    .paddingInner(columnGap / (columnGap + columnWidth));

  const y = d3
    .scaleBand()
    .domain(ranks)
    .range([marginTop, height - marginBottom])
    .paddingOuter(0)
    .paddingInner(rowGap / (rowGap + rowHeight));

  const z = d3
    .scaleLinear()
    .domain([0, d3.max(nodes, accessors.views)])
    .range([0, columnWidth]);

  const line = d3
    .line()
    .x((d) => x(d.date) + (d.edge === "end" ? x.bandwidth() : 0))
    .y((d) =>
      d.rank === null ? height - 16 : y(d.rank) + rowHeight - barHeight / 2,
    )
    .curve(d3.curveBumpX);

  const container = d3.select("#chart").classed("bump-chart", true);

  container
    .selectChildren(".ranks-container")
    .data(["left", "right"])
    .join("svg")
    .attr("class", "ranks-container")
    .attr("data-side", (d) => d)
    .attr("width", rankColumnWidth)
    .attr("height", height)
    .selectChildren(".rank")
    .data(ranks)
    .join("text")
    .attr("class", "rank")
    .attr("text-anchor", "middle")
    .attr("dy", "0.32em")
    .attr(
      "transform",
      (d) =>
        `translate(${rankColumnWidth / 2},${y(d) + rowHeight - barHeight / 2})`,
    )
    .text((d) => d);

  const svg = container
    .insert("svg", ".ranks-container:last-child")
    .attr("class", "main-container")
    .attr("width", width)
    .attr("height", height);

  const columnG = svg
    .append("g")
    .attr("class", "columns")
    .selectChildren(".column")
    .data(dates)
    .join("g")
    .attr("class", "column")
    .attr("transform", (d) => `translate(${x(d) + x.bandwidth() / 2},0)`);

  columnG
    .append("text")
    .attr("class", "column__title")
    .attr("text-anchor", "middle")
    .attr("dy", "0.71em")
    .text((d) => formatDateLabel(new Date(d)));

  const linkG = svg
    .append("g")
    .attr("class", "links")
    .attr("fill", "none")
    .selectChildren(".link")
    .data(links)
    .join("g")
    .attr("class", "link");

  linkG
    .append("path")
    .attr("class", "link__stroke")
    .attr("stroke-width", linkWidth + strokeWidth * 2)
    .attr("d", (d) => line(d.points))
    .clone()
    .attr("class", "link__fill")
    .attr("stroke-width", linkWidth);

  const nodeG = svg
    .append("g")
    .attr("class", "nodes")
    .selectChildren(".node")
    .data(nodes)
    .join("g")
    .attr("class", "node")
    .attr(
      "transform",
      (d) => `translate(${x(accessors.date(d))},${y(accessors.rank(d))})`,
    );

  const barG = nodeG
    .append("g")
    .attr("class", "node__bar bar")
    .attr("transform", `translate(0,${rowHeight - barHeight})`);

  barG
    .append("rect")
    .attr("class", "bar__cover")
    .attr("width", columnWidth)
    .attr("height", barHeight)
    .attr("stroke-width", strokeWidth);

  barG
    .append("rect")
    .attr("class", "bar__fill")
    .attr("width", (d) => z(accessors.views(d)) - z(0))
    .attr("height", barHeight);

  barG
    .append("rect")
    .attr("class", "bar__track")
    .attr("width", columnWidth)
    .attr("height", barHeight)
    .attr("stroke-width", strokeWidth);

  barG
    .append("text")
    .attr("class", "bar__label")
    .attr("x", (d) => z(accessors.views(d)))
    .attr("y", barHeight / 2)
    .attr("dy", "0.32em")
    .text(accessors.viewsLabel)
    .each(function (d) {
      const labelWidth = this.getComputedTextLength();
      const barWidth = z(accessors.views(d)) - z(0);
      const outside = labelWidth + barLabelBarGap * 2 > barWidth;
      d3.select(this)
        .attr("text-anchor", outside ? "start" : "end")
        .attr("dx", outside ? barLabelBarGap : -barLabelBarGap);
    });

  nodeG
    .append("text")
    .attr("class", "node__eyebrow")
    .attr("y", platformLabelHeight)
    .text(accessors.platform);

  nodeG
    .append("text")
    .attr("class", "node__title")
    .attr(
      "y",
      platformLabelHeight + platformLabelTitleLabelGap + titleLabelHeight,
    )
    .text(accessors.title);

  const linkCoversG = svg
    .append("g")
    .attr("class", "links")
    .attr("fill", "none")
    .selectChildren(".link")
    .data(links)
    .join("g")
    .attr("class", "link");
  linkCoversG
    .selectChildren(".link__cover")
    .data((d) => d.points.filter((d) => d.rank !== null))
    .join("line")
    .attr("class", "link__cover")
    .attr("stroke-width", strokeWidth)
    .attr("x1", (d) => x(d.date) + (d.edge === "end" ? x.bandwidth() : 0))
    .attr("y1", (d) => y(d.rank) + rowHeight - barHeight / 2 - linkWidth / 2)
    .attr("x2", (d) => x(d.date) + (d.edge === "end" ? x.bandwidth() : 0))
    .attr("y2", (d) => y(d.rank) + rowHeight - barHeight / 2 + linkWidth / 2);
});
