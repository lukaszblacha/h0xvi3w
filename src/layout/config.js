export const defaultLayout = {
  "type": "hv-split",
  "orientation": "vertical",
  "items": [
    {
      "type": "hv-split",
      "orientation": "horizontal",
      "items": [
        {
          "type": "hv-tabs",
          "tabs-position": "top",
          "items": [
            {
              "type": "hv-editor",
              "views": "hex,ascii",
              "mode": "overwrite"
            }
          ]
        },
        {
          "type": "hv-split",
          "orientation": "vertical",
          "items": [
            {
              "type": "hv-tabs",
              "tabs-position": "top",
              "items": [
                {
                  "type": "hv-values-explorer",
                  "big-endian": "false"
                }
              ]
            },
            {
              "type": "hv-tabs",
              "tabs-position": "top",
              "items": [
                {
                  "type": "hv-canvas",
                  "width": 50,
                  "offset": 0,
                  "bpp": 1,
                  "scanline": 0,
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "hv-tabs",
      "tabs-position": "bottom",
      "items": [
        {
          "type": "hv-strings",
          "min-length": "6",
          "case-sensitive": "false"
        }
      ]
    }
  ]
};
