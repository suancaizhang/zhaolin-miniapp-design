import type { CreationStage, GalleryImage, GallerySeries, ImageView, Work } from '../../shared/types';

export interface GalleryWork extends Omit<Work, 'status'> {
  shareImageUrl: string;
}
export interface GalleryCatalog {
  works: GalleryWork[];
  series: GallerySeries[];
}

// Captured profile covers and file provenance: materials/xiaohongshu/sources.json.
// Descriptive titles and visual grouping do not claim verified work identity or dates.
const references: {
  id: string;
  title: string;
  alt: string;
  height: number;
  view: ImageView;
  seriesIds: string[];
  stage?: CreationStage;
  featured?: boolean;
}[] = [
  {
    id: 'source-01', title: '西王母 · 设色',
    alt: '灰褐底材上的西王母半身画，冠饰与衣纹已铺青绿和赭褐底色',
    height: 640, view: '整体', seriesIds: ['figures', 'studies'], stage: '设色', featured: true,
  },
  {
    id: 'source-02', title: '西王母 · 线描',
    alt: '纸上的人物黑线稿，冠饰、面部与层叠衣纹清晰可见',
    height: 612, view: '整体', seriesIds: ['figures', 'studies'], stage: '线稿',
  },
  {
    id: 'source-03', title: '敦煌57窟 · 线稿',
    alt: '灰白底材上的全身菩萨黑线稿，具有圆背光、冠饰和长披帛',
    height: 640, view: '整体', seriesIds: ['figures'], stage: '线稿', featured: true,
  },
  {
    id: 'source-04', title: '创作现场 · 伏案绘制',
    alt: '创作者伏案描绘大幅人物画，桌面和身后的画稿一同入镜',
    height: 360, view: '局部', seriesIds: ['studio'],
  },
  {
    id: 'source-05', title: '创作现场 · 大幅画稿',
    alt: '铺满桌面的大幅人物画稿，背景可见彩色壁画',
    height: 640, view: '局部', seriesIds: ['studio'],
  },
  {
    id: 'source-06', title: '千手观音 · 衣饰与手势',
    alt: '人物衣饰与多只手臂的局部画面，朱红和青绿点缀其间',
    height: 360, view: '局部', seriesIds: ['figures', 'studies'], stage: '设色', featured: true,
  },
  {
    id: 'source-07', title: '千手观音 · 衣纹局部',
    alt: '人物腰部、衣纹与层叠手臂的横向局部画面',
    height: 360, view: '局部', seriesIds: ['figures'], stage: '设色',
  },
  {
    id: 'source-08', title: '千手观音 · 手臂构成',
    alt: '密集排列的手臂、手势与衣纹细线构成弧形画面',
    height: 360, view: '局部', seriesIds: ['figures', 'studies'], stage: '线稿',
  },
  {
    id: 'source-09', title: '千手观音 · 人物局部',
    alt: '人物头部、肩部与周围层叠手臂的局部线描',
    height: 360, view: '局部', seriesIds: ['figures'], stage: '线稿',
  },
  {
    id: 'source-10', title: '千手观音 · 面部与背光',
    alt: '画稿中并列的人物面部、冠饰与圆形背光',
    height: 360, view: '局部', seriesIds: ['figures'], stage: '线稿',
  },
  {
    id: 'source-11', title: '人物 · 面部勾线',
    alt: '纸上人物面部与肩部的黑线勾描，周围保留浅色构图线',
    height: 640, view: '局部', seriesIds: ['figures', 'studies'], stage: '线稿',
  },
  {
    id: 'source-12', title: '创作现场 · 线稿观察',
    alt: '创作者坐在铺展的线稿旁，桌面画稿与人物同时入镜',
    height: 639, view: '局部', seriesIds: ['studio'],
  },
  {
    id: 'source-13', title: '创作现场 · 铺展画稿',
    alt: '桌面铺展的大幅人物线稿，画面中可见圆形背光和衣纹',
    height: 360, view: '局部', seriesIds: ['studio', 'studies'],
  },
  {
    id: 'source-14', title: '菩萨 · 立姿朱线',
    alt: '灰白底材上的全身立姿菩萨朱红线稿，背光、衣饰与披帛完整展开',
    height: 813, view: '整体', seriesIds: ['figures', 'studies'], stage: '线稿', featured: true,
  },
  {
    id: 'source-15', title: '手势与持物 · 朱线',
    alt: '米黄纸上的朱红线描，手握装饰器物，腕下有祥云',
    height: 640, view: '整体', seriesIds: ['hands', 'studies'], stage: '线稿', featured: true,
  },
  {
    id: 'source-16', title: '手势 · 层叠持物',
    alt: '朱红线描的手掌托起层叠装饰器物，手腕下方环绕云纹',
    height: 640, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
  {
    id: 'source-17', title: '手势 · 指尖与腕饰',
    alt: '两只手以细长手指交叠成姿，手腕佩有多层珠饰',
    height: 592, view: '整体', seriesIds: ['hands', 'studies'], stage: '线稿',
  },
  {
    id: 'source-18', title: '手势 · 环形持物',
    alt: '朱线手掌持环形装饰，弯曲的手指与卷云相互呼应',
    height: 670, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
  {
    id: 'source-19', title: '手势 · 云纹与带饰',
    alt: '手指托起卷曲云纹，长带沿画面向下垂落',
    height: 640, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
  {
    id: 'source-20', title: '手势 · 细长持物',
    alt: '上举的手指握住细长器物，腕部与下方卷云以朱线勾出',
    height: 646, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
  {
    id: 'source-21', title: '手势 · 托举供器',
    alt: '向上摊开的手掌托起小型供器，器物上方有卷曲装饰',
    height: 658, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
  {
    id: 'source-22', title: '手势 · 圆形持物',
    alt: '屈指的手掌握住圆形持物，手腕处连接细密云纹',
    height: 668, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
  {
    id: 'source-23', title: '手势 · 花枝',
    alt: '上举的手掌持弯曲花枝，手腕下方卷云舒展',
    height: 640, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
  {
    id: 'source-24', title: '手势 · 莲花',
    alt: '佩有腕饰的手掌持莲花，花瓣与长茎以朱线描绘',
    height: 640, view: '整体', seriesIds: ['hands', 'studies'], stage: '线稿',
  },
  {
    id: 'source-25', title: '手势 · 鸟形持物',
    alt: '手掌托举带有鸟形轮廓的装饰持物，周围有细长飘带',
    height: 640, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
  {
    id: 'source-26', title: '手势 · 宝盖',
    alt: '朱线手掌托起伞盖形器物，器物边缘垂下装饰',
    height: 657, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
  {
    id: 'source-27', title: '手势 · 莲枝与结带',
    alt: '手指持莲花长枝，枝下有环形结带与垂落的装饰',
    height: 640, view: '整体', seriesIds: ['hands', 'studies'], stage: '线稿', featured: true,
  },
  {
    id: 'source-28', title: '手势 · 装饰持物',
    alt: '上举手掌握住纵向装饰器物，腕饰与器物细节以朱线勾出',
    height: 658, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
  {
    id: 'source-29', title: '手势 · 宝瓶',
    alt: '手掌托起细颈圆腹器物，手腕下方是弯曲卷云',
    height: 655, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
  {
    id: 'source-30', title: '手势 · 剑形持物',
    alt: '手指握住斜向上伸出的剑形器物，腕部被细密卷云围绕',
    height: 692, view: '整体', seriesIds: ['hands'], stage: '线稿',
  },
];

export const localCatalog: GalleryCatalog = {
  works: references.map((reference, index): GalleryWork => {
    const image: GalleryImage = {
      id: `${reference.id}-image`, alt: reference.alt, view: reference.view,
      width: 480, height: reference.height,
      url: `/assets/works/${reference.id}.jpg`,
      thumbUrl: `/assets/works/${reference.id}-thumb.jpg`,
    };
    return {
      id: reference.id, title: reference.title, description: `${reference.alt}。`,
      shareImageUrl: `/assets/works/${reference.id}-share.jpg`,
      year: '', material: '', dimensions: '',
      featured: reference.featured === true, sort: (index + 1) * 10,
      seriesIds: reference.seriesIds, images: [image],
      coverImageId: image.id, overallImageId: image.id,
      records: reference.stage ? [{
        id: `${reference.id}-reference`, stage: reference.stage, view: image.view,
        caption: reference.alt, date: '', imageId: image.id,
      }] : [],
      sourceRefs: [],
    };
  }),
  series: [
    { id: 'figures', name: '壁画人物', description: '从冠饰、衣纹与人物姿态看起。', coverImageId: 'source-01-image', sort: 10 },
    { id: 'hands', name: '手势与持物', description: '一处手势，一段线条。', coverImageId: 'source-15-image', sort: 20 },
    { id: 'studies', name: '一笔一线', description: '沿着画面的线条，慢慢欣赏。', coverImageId: 'source-14-image', sort: 30 },
    { id: 'studio', name: '创作现场', description: '画稿铺展时，记录绘制与观察。', coverImageId: 'source-04-image', sort: 40 },
  ],
};
