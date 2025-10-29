export const defaultLayout = {
  "type": "hv-split",
  "properties": {
    "orientation": "vertical",
  },
  "items": [
    {
      "type": "hv-split",
      "properties": {
        "orientation": "horizontal",
      },
      "items": [
        {
          "type": "hv-tabs",
          "items": [
            {
              "type": "hv-editor"
            }
          ]
        },
        {
          "type": "hv-split",
          "properties": {
            "orientation": "vertical",
          },
          "items": [
            {
              "type": "hv-tabs",
              "items": [
                {
                  "type": "hv-values-explorer"
                }
              ]
            },
            {
              "type": "hv-tabs",
              "properties": {
                "tabsPosition": "top",
              },
              "items": [
                {
                  "type": "hv-canvas"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "hv-tabs",
      "properties": {
        "tabsPosition": "bottom"
      },
      "items": [
        {
          "type": "hv-strings"
        }
      ]
    }
  ]
};
