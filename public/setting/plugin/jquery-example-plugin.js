/* jquery-example-plugin.js */
//We start with a function and pass a jQuery class to it as a 
//parameter $ to avoid the conflict with other javascript 
//plugins that uses '$ as a name
(function($){
    //We now append our function to the jQuery namespace, 
    //with an option parameter
    $.fn.example = function(options) {
        //the settings parameter will be our private parameter to our function
        //'example', using jQuery.extend append 'options' to our settings
        var settings = jQuery.extend({
            param:'value',
        }, options);
        //Define a reference to our function myplugin which it's 
        //part of jQuery namespace functions, so we can use later
        //within inside functions
        var $jquery=this;

        //Define an output object that will work as a reference
        //for our function
        var output={
            //Setup our plugin functions as an object elements
            'function1':function(param){
                //Call jQuery reference that goes through jQuery selector
                $jquery.each(function(){
                    //Define a reference of each element of jQuery 
                    //selector elements
                    var _this=this;
                });
                //This steps is required if you want to call nested
                //functions like jQuery.
                return output;
            },
            //If we want to make our plugin to do a specific operations
            //when called, we define a function for that
            'init':function(){
                $jquery.each(function(){
                    var _this=this;
                    //Note that _this param linked to each jQuery 
                    //functions not element, thus wont behave like 
                    //jQuery function.
                    //And for that we set a parameter to reference the
                    //jQuery element
                    _this.$this=$(this);

                    //We can define a private function for 'init'
                    //function
                    var privatefun=function(){}
                    privatefun();

                    //We can now do jQuery stuffs on each element
                    _this.$this.on('click',function(){
                        //jQuery related stuffs
                    });
                });
                //We can call whatever function we want or parameter
                //that belongs to our plugin
                output.function1("value");
            }
        };
        //Our output is ready, if we want our plugin to execute a
        //function whenever it called we do it now
        output.init();

        //And the final critical step, return our object output to
        //the plugin
        return output;
    };
//Pass the jQuery class so we can use it inside our plugin 'class'
})(jQuery);        
