const path = require('path');
const db = require('../database/models');
const sequelize = db.sequelize;
const { Op, DATE, DATEONLY } = require("sequelize");
const { stringify } = require('querystring');
const moment = require('moment');
const Actor_Movie = require('../database/models/Actor_Movie');

const moviesController = {
    list: (req, res) => {
        db.Movie.findAll()
            .then(movies => {
                res.render('moviesList.ejs', {movies})
            })
    },
    detail: (req, res) => {
        db.Movie.findByPk(req.params.id)
            .then(movie => { 
                db.Genre.findByPk(movie.genre_id).then(genre=>{
                    return res.render('moviesDetail',{movie,genre,moment})
                })
            });
    },
    new: (req, res) => {
        db.Movie.findAll({
            order : [
                ['release_date', 'DESC']
            ],
            limit: 5
        })
            .then(movies => {
                res.render('newestMovies', {movies});
            });
    },
    recomended: (req, res) => {
        db.Movie.findAll({
            where: {
                rating: {[db.Sequelize.Op.gte] : 8}
            },
            order: [
                ['rating', 'DESC']
            ]
        })
            .then(movies => {
                res.render('recommendedMovies.ejs', {movies});
            });
    },
    add: function (req, res) {
        db.Genre.findAll({
            order:['name']
        })
        .then(allGenres=>{
                return res.render('moviesAdd',{allGenres})
        })
        .catch(error=>console.log(error))
    },
    create: function (req,res) {
        const {title,rating,awards,release_date,length,genre_id} = req.body;
        db.Movie.create({
            title:title.trim(),
            rating,
            awards,
            release_date,
            length,
            genre_id,
        }).then(()=>{
            return res.redirect("/movies");
        }).catch((error)=>console.log(error));
    },
    edit: function(req,res) {
        const allGenres = db.Genre.findAll({
            order:["name"]
        });
        const movie = db.Movie.findByPk(req.params.id,{
            include: ['actors']
        });
        const actors = db.Actor.findAll({
            order: [
                ['first_name','ASC'],
                ['last_name','ASC']
            ]  
        });
        Promise.all([allGenres,movie,actors])
            .then(([allGenres,movie,actors])=>{
                return res.render('moviesEdit',{allGenres,movie,moment,actors});
        })
        .catch(error=>console.log(error))
    },
    update: function (req,res) {
        let {title,awards,rating,length,release_date,genre_id,actors}=req.body;
        
        actors = typeof actors === "string" ? [actors] : actors;

        db.Movie.update({
                    title: title.trim(),
                    awards,
                    rating,
                    release_date,
                    length,
                    genre_id
                },
                {
                    where: {
                        id:req.params.id
                    }
                }).then(()=>{
                    db.Actor_Movie.destroy({
                        where: {
                            movie_id : req.params.id
                        }
                    }).then(()=>{
                        if(actors){
                           const actorsDB = actors.map(actor=>{
                            return {
                                movie_id : req.params.id,
                                actor_id : actor 
                            }
                            })
                            db.Actor_Movie.bulkCreate(actorsDB,{
                            validate : true
                            }).then(()=> console.log("Actores agregados"))  
                        }
                    })
                })
                .catch(error=> console.log(error)).finally(()=>res.redirect('/movies'))
    },
    destroy: function (req,res) {
        db.Actor_Movie.destroy({
            where:{
                movie_id:req.params.id
            }
        })
        .then(()=>{
            db.Actor.update(
                {
                    favorite_movie_id: null
                },
                {
                    where:{
                        favorite_movie_id :req.params.id
                    }
                })
            .then(()=>{
                db.Movie.destroy({
                    where:{
                        id:req.params.id
                    }
                })
                .then(()=>{
                    return res.redirect('/movies');
            })
        })
        
        }).catch(error=>console.log(error));
    }
}

module.exports = moviesController;