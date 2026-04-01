# TODO

## ProxyWidget
class containing the list of widgets per type:
- MapWCList
- TableWCList
- ImageWCList
It is in charge of registering the establishment of connection between widget of different type (e.g. MapWC 1 with TableWC 2)
- TableWCtoMapWC
- MapWCtoTableWC
- ...

## TableWC
- overlay a full dataset on top of one of ProxyWidget.MapWCList <- establish link in TableWCtoMapWC and corresponding MapWCtoTableWC
- overlay a full dataset on top of all ProxyWidget.MapWCList  <- establish link in TableWCtoMapWC and corresponding MapWCtoTableWC

- overlay only selected rows on top of one of ProxyWidget.MapWCList <- establish link in TableWCtoMapWC and corresponding MapWCtoTableWC
- overlay only selected rows on top of all ProxyWidget.MapWCList <- establish link in TableWCtoMapWC and corresponding MapWCtoTableWC

- for each row, show in which MapWC is overlaied

- allow row selection by MapWC

## MapWC
- right click on a source <- show context menu (callback to Astro-viewer?):
    - show in TableWC
    - remove from selection <- reflect in TableWC    
- settings: color, shape, hue, ... 
- show dataset details
- hide/show a given dataset
- show the provenance TableWC of each dataset 

