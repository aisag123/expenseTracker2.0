import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'login'
	},
	{
		path: 'login',
		loadComponent: () =>
			import('./components/login-page/login-page').then((m) => m.LoginPageComponent)
	},
	{
		path: 'signup',
		loadComponent: () =>
			import('./components/signup-page/signup-page').then((m) => m.SignupPageComponent)
	},
	{
		path: 'profile',
		loadComponent: () =>
			import('./components/profile-page/profile-page').then((m) => m.ProfilePageComponent)
	},
	{
		path: 'transactions',
		loadComponent: () =>
			import('./components/transactions-page/transactions-page').then(
				(m) => m.TransactionsPageComponent
			)
	},
	{
		path: 'dashboard',
		loadComponent: () =>
			import('./components/dashboard-page/dashboard-page').then(
				(m) => m.DashboardPageComponent
			)
	},
	{
		path: '**',
		redirectTo: 'login'
	}
];
