import {ChainInfo} from '../../interfaces/dataFetcher.interface';
import {Entity} from '../../interfaces/pdbEntity.interface';
import {Log} from '../log.model';

export class FeatureViewerModel {

  static unpUrl = 'https://www.uniprot.org/uniprot/';
  static chaUrl = 'http://www.rcsb.org/structure/';
  static pdbUrl = 'http://repeatsdb.bio.unipd.it/protein/';
  static colorsHex = {
    uniprot: '#70B77E',
    chains: '#D62839',
    unitsLight: '#00709B',
    unitsDark: '#03256C',
    insertions: '#F2BB05',
    custom: '#1C7C54'
  };


  // /** Custom entities */
  static buildCusFt(start: string, end: string, sequenceLength: number, actualPdb: string) {

    const x = +start;
    const y = +end;
    if (isNaN(x) || isNaN(y)) {
      Log.w(1, 'non-numeric field for custom entity.');
      return undefined;
    }

    if (x < 1 || y > sequenceLength) {
      Log.w(1, 'out-of-bounds custom entity.');
      return undefined;
    }

    if (x >= y) {
      Log.w(1, 'entity start is after entity end.');
      return undefined;
    }
    const res = {
      type: 'rect', label: `custom`,
      id: `custom`, data: [{x, y, color: this.colorsHex.custom, label: actualPdb}], isOpen: true,
      sidebar: [
        {
          id: 'MyCust',
          tooltip: actualPdb,
          content: `<a id="usr" target="_blank"></a>`,
        }
      ]
    };

    return res;
  }

  /** Uniprot entities */
  static buildUnpFt(uniprotId: string, sequenceLength: number) {
    return {
      type: 'rect', color: this.colorsHex.uniprot, label: uniprotId, id: `p-${uniprotId}`,
      data: [
        { x: 1, y: sequenceLength }
      ],
      sidebar: [
        {
          id: 'MyHtml',
          tooltip: 'UNIPROT ' + uniprotId,
          content: `<a target="_blank" href="${FeatureViewerModel.unpUrl}${uniprotId}"><i class="fa fa-link" aria-hidden="true"></i></a>`,
        }
      ]
    };
  }

  /** Chain entities */
  static buildChFt(pdb: string, chainInfo: ChainInfo) {
    const res =  {
      type: 'rect',
      label: `${pdb}-${chainInfo.chain_id}`,
      id: `c-${pdb}-${chainInfo.chain_id}`,
      data: [],
      isOpen: true,
      sidebar: [
        {
          id: 'MyHtml',
          tooltip: `${pdb}-${chainInfo.chain_id}`,
          content: ''
        },
        {
          id: 'MyHtml',
          tooltip: `PDB ${pdb}-${chainInfo.chain_id}`,
          content: ''
        }
      ]
    };

    res.data.push({x: chainInfo.unp_start, y: chainInfo.unp_end, color: this.colorsHex.chains});

    res.sidebar[0].content = `<a style="width: 16px;"></a>`; // TODO color only pdb
    res.sidebar[1].content =  `<a target="_blank" href="${FeatureViewerModel.chaUrl}${pdb}">
                                    <i style="margin-top:5px;" class="fa fa-external-link-square" aria-hidden="true"></i></a>`; // PDB
    return res;
  }

  static buildRegFt(pdb: string, chainInfo: ChainInfo) {

    const result = [];
    const regions = chainInfo.regions;
    let flagAdditional = false;
    let obj;

    const convUnits = [];
    const convIns = [];
    for (const region of regions) {

      obj = FeatureViewerModel.convertEntities(region.units, chainInfo);
      Array.prototype.push.apply(convUnits, obj.convertedEntities);
      if (obj.flagAdditional === false) {
        obj = FeatureViewerModel.convertEntities(region.insertions, chainInfo);
        Array.prototype.push.apply(convIns, obj.convertedEntities);
      } else {
        obj = FeatureViewerModel.convertEntities(region.insertions, chainInfo);
        Array.prototype.push.apply(convIns, obj.convertedEntities);
        flagAdditional = true;
      }
    }
    if (convUnits.length > 0) {
      result.push(FeatureViewerModel.buildEntityFt('units', pdb, chainInfo.chain_id, convUnits));
    }

    if (convIns.length > 0) {
      result.push(FeatureViewerModel.buildEntityFt('insertions', pdb, chainInfo.chain_id, convIns));
    }
    return [result, flagAdditional];

  }

  private static buildEntityFt(
    feature: string, pdb: string, chain: string, data: Array<{x: number, y: number, color: string}>) {

    let label = `u-${pdb}-${chain}`;


    if (feature !== 'units' && data.length > 0) {
      for (const elem of data) {
        elem.color = this.colorsHex.insertions;
      }
      label = `i-${pdb}-${chain}`;
    }
    let flag = true;
    if (data.length > 1) {

      for (const elem of data) {
        if (flag) {
          elem.color = this.colorsHex.unitsDark;
          flag = !flag;
          continue;
        }
        elem.color = this.colorsHex.unitsLight;
        flag = !flag;
      }
      const dt = JSON.stringify(data);
      return {
        type: 'rect',
        label,
        data,
        isOpen: true,
        sidebar: [
          {
            id: 'MyHtml',
            tooltip: `${pdb}-${chain}`,
            content: `<a target="_blank">
                    <i
                                              data-pdb="${label}"
                                              data-xy = '${dt}'
                                              class="fa fa-paint-brush" aria-hidden="true"></i></a>`
          },
          {
            id: 'MyHtml',
            tooltip: `RpsDb ${pdb}-${chain}`,
            content: `<a target="_blank" href="${FeatureViewerModel.pdbUrl}${pdb}${chain}">
                    <i class="fa fa-external-link" aria-hidden="true"></i></a>` // RepeatsDb
          }
        ]
      };
    } else { // if I have a single element I don't need the paint brush
      return {
        type: 'rect', label, data,
        isOpen: true,
        sidebar: [
          {
            id: 'MyHtml',
            tooltip: `${pdb}-${chain}`,
            content: `<a target="_blank" style="width: 16px;"></a>`
          },
          {
            id: 'MyHtml',
            tooltip: `RpsDb ${pdb}-${chain}`,
            content: `<a target="_blank" href="${FeatureViewerModel.pdbUrl}${pdb}${chain}">
                    <i class="fa fa-external-link" aria-hidden="true"></i></a>` // RepeatsDb
          }
        ]
      };
    }
  }

  public static convertEntities(entities: Array<Entity>, convObj) {
    let flagAdditional = false;
    const convertedEntities = [];
    let start: number;
    let end: number;

    for (const entity of entities) {

      start = FeatureViewerModel.convertBound(entity.start, convObj.aut_to_unp);
      end = FeatureViewerModel.convertBound(entity.end, convObj.aut_to_unp);

      if (start === undefined && end === undefined) {
        // Log.w(1, 'unit completely outside the uniprot.');
        flagAdditional = true;
        continue;
      } else if (start === undefined) {
        // Log.w(1, 'unit start outside the uniprot.');
        flagAdditional = true;
        start = convObj.unp_start;
      } else if (end === undefined) {
        flagAdditional = true;
        // Log.w(1, 'unit end outside the uniprot.');
        end = convObj.unp_end;
      }

      convertedEntities.push({x: start, y: end});
    }
    const obj = {
      convertedEntities,
      flagAdditional
    };

    return obj;
  }

  private static convertBound(bound: number, convObj: {[aut: string]: number}) {

    if (!(bound in convObj)) {
      // Log.w(1,  'bound not in conversion object.');
      return undefined;
    }

    const convBound = convObj[bound];
    if (typeof convBound === 'string') {
      // Log.w(1,  'unit outside uniprot boundary');
      return undefined;
    }

    return convBound;
  }

}
