import Carousel from '../carousel';
import css from './pc.css';

window.onload = function(){
	new Carousel({
		leftArrow: document.querySelector('.d1 .left'),
		rightArrow: document.querySelector('.d1 .right'),
		container: document.querySelector('.d1 .carousel'),
		wrap: document.querySelector('.d1 .wrap')
	});

	new Carousel({
		multi: true,
		leftArrow: document.querySelector('.d2 .left'),
		rightArrow: document.querySelector('.d2 .right'),
		container: document.querySelector('.d2 .carousel'),
		wrap: document.querySelector('.d2 .wrap')
	});

	new Carousel({
		enablePosition: true,
		leftArrow: document.querySelector('.d3 .left'),
		rightArrow: document.querySelector('.d3 .right'),
		container: document.querySelector('.d3 .carousel'),
		wrap: document.querySelector('.d3 .wrap')
	});
}