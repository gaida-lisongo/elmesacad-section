
// Importation des icônes spécifiques depuis votre package @iconify/icons-ion
import eyeOutline from '@iconify/icons-ion/eye-outline';
import cashOutline from '@iconify/icons-ion/cash-outline';
import cubeOutline from '@iconify/icons-ion/cube-outline';
import peopleOutline from '@iconify/icons-ion/people-outline';
import logoApple from '@iconify/icons-ion/logo-apple';
import logoGoogle from '@iconify/icons-ion/logo-google';
import logoTux from '@iconify/icons-ion/logo-tux'; // Remplacement temporaire pour Tesla/X si nécessaire
import { Metrique } from '../_components/MetricItem';
import { ChartData } from '../_components/ChartCard';
import { ListItem } from '../_components/ListData';

export interface UserRow {
  name: string;
  position: string;
  office: string;
  age: number;
  startDate: string;
  salary: string;
}

// 1. Données pour MetricItem (Structure exacte de votre capture d'écran 3)
export const mockMetrics = (IconComponent: any): Metrique[] => [
  {
    title: 'Total Views',
    value: '3.5K',
    proportion: 0.43,
    icone: IconComponent({ icon: eyeOutline, className: "w-6 h-6 text-emerald-500" }),
  },
  {
    title: 'Total Profit',
    value: '$4.2K',
    proportion: 4.35,
    icone: IconComponent({ icon: cashOutline, className: "w-6 h-6 text-orange-500" }),
  },
  {
    title: 'Total Products',
    value: '3.5K',
    proportion: 2.59,
    icone: IconComponent({ icon: cubeOutline, className: "w-6 h-6 text-violet-500" }),
  },
  {
    title: 'Total Users',
    value: '3.5K',
    proportion: -0.95,
    icone: IconComponent({ icon: peopleOutline, className: "w-6 h-6 text-sky-500" }),
  },
];

// 2. Données pour ChartCard (Graphique Linéaire & Barres de vos captures)
export const mockPaymentsChart: ChartData = {
  x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  y: [10, 22, 38, 42, 35, 62, 70, 65, 78, 88, 72, 68], // Ligne Received
  y2: [18, 12, 18, 28, 22, 52, 60, 58, 62, 85, 75, 62], // Ligne Due
  z: { slug: 'line', title: 'Payments Overview' },
};

export const mockWeeklyProfitChart: ChartData = {
  x: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  y: [45, 55, 42, 68, 20, 44, 65], // Sales (Barres bleues)
  y2: [12, 22, 20, 10, 15, 25, 18], // Revenue (Barres cyan empilées/côte à côte)
  z: { slug: 'bar', title: 'Profit this week' },
};

// 3. Données pour ListData (Structure de votre capture d'écran 1 : "My Stocks")
export const mockStocks = (IconComponent: any): ListItem[] => [
  {
    title: 'Apple Inc',
    description: '16 Shares',
    value: '$410.5',
    proportion: 0.95,
    icon: IconComponent({ icon: logoApple, className: "w-5 h-5 text-slate-900" }),
  },
  {
    title: 'Google',
    description: '100 Shares',
    value: '$410.5',
    proportion: 0.95,
    icon: IconComponent({ icon: logoGoogle, className: "w-5 h-5 text-slate-600" }),
  },
  {
    title: 'Tesla',
    description: '20 Shares',
    value: '$410.5',
    proportion: 0.95,
    icon: IconComponent({ icon: logoTux, className: "w-5 h-5 text-red-600" }),
  },
  {
    title: 'X.com',
    description: '87 Shares',
    value: '$410.5',
    proportion: -0.95,
    icon: IconComponent({ icon: logoTux, className: "w-5 h-5 text-slate-900" }),
  },
];

// 4. Données pour TableData (Structure exacte de votre capture d'écran 2)
export const mockTableUsers: UserRow[] = [
  { name: 'Brielle Kuphal', position: 'Senior Javascript Developer', office: 'Edinburgh', age: 25, startDate: '2012/03/29', salary: '$433 060' },
  { name: 'Barney Murray', position: 'Senior Backend Developer', office: 'amsterdam', age: 29, startDate: '2010/05/01', salary: '$424 785' },
  { name: 'Ressie Ruecker', position: 'Senior Frontend Developer', office: 'Jakarta', age: 27, startDate: '2013/07/01', salary: '$785 210' },
  { name: 'Teresa Mertz', position: 'Senior Designer', office: 'New Caledonia', age: 25, startDate: '2014/05/30', salary: '$532 126' },
  { name: 'Chelsey Hackett', position: 'Product Manager', office: 'NewYork', age: 26, startDate: '2011/09/30', salary: '$421 541' },
];