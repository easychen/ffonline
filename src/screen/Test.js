import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
import { Link } from "react-router-dom";
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';

import DocumentTitle from 'react-document-title';
import ReactFileReader from 'react-file-reader';

import { Button, ProgressBar } from "@blueprintjs/core";
import FileSaver from 'file-saver';

@withRouter
@translate()
@inject("store")
@observer
export default class Test extends Component
{
    state = {"download_url":false,"show_loading":false};
    
    componentDidMount()
    {
        this.workerPath = location.href.replace(location.href.split('/').pop(), '') + 'ffmpeg_all.js';
        this.buffersReady = false ;
        this.workerReady = false ;
        this.posted = false;
        this.worker = false;
    }

    processInWebWorker() 
    {
        var blob = URL.createObjectURL(new Blob([`
        importScripts("${this.workerPath}");
        var now = Date.now;
        function print(text) 
        {
            postMessage({"type" : "stdout","data" : text});};
            onmessage = function(event)
            {
                var message = event.data;
                if (message.type === "command") 
                {
                    var Module = {print: print,printErr: print,files: message.files || [],arguments: message.arguments || [],TOTAL_MEMORY: 943718400};
                    
                    postMessage({"type" : "start","data" : Module.arguments.join(" ")});
                    
                    postMessage({"type" : "stdout","data" : "Received command: " +Module.arguments.join(" ") +((Module.TOTAL_MEMORY) ? ".  Processing with " + Module.TOTAL_MEMORY + " bits." : "")});var time = now();var result = ffmpeg_run(Module);var totalTime = now() - time;postMessage({"type" : "stdout","data" : "Finished processing (took " + totalTime + "ms)"});postMessage({"type" : "done","data" : result,"time" : totalTime});}};postMessage({"type" : "ready"});`], {
            type: 'application/javascript'
        }));
    
        var worker = new Worker(blob);
        URL.revokeObjectURL(blob);
        return worker;
    }
    
    cover_uploaded( files )
    {
        const file = files[0];
        this.coverBlob = new Blob([file],{type:'image/jpeg'}); 

        console.log( file );
    }

    audio_uploaded( files )
    {
        const file = files[0];
        this.audioBlob = new Blob([file],{type:'audio/mp3'}); 
        console.log( file );
    }

    convert()
    {
        this.setState({"show_loading":true});
        
        var fileReader1 = new FileReader();
        fileReader1.onload = (e)=> {
            console.log( e );
            
            this.cover_data = e.target.result;
            if( this.audio_data ) this.buffersReady = true;
            if( this.buffersReady && this.workerReady && !this.posted )
                this.postMessage();
        };

        var fileReader2 = new FileReader();
        fileReader2.onload = (e)=> {
            this.audio_data = e.target.result;
            if( this.cover_data ) this.buffersReady = true;
            if( this.buffersReady && this.workerReady && !this.posted )
                this.postMessage();
        };

        // console.log( typeof this.coverBlob )

        fileReader1.readAsArrayBuffer(this.coverBlob);
        fileReader2.readAsArrayBuffer(this.audioBlob);
        //console.log( "convert" );
        if( !this.worker )
        {
            this.worker = this.processInWebWorker();
        }

        this.worker.onmessage = (event)=> 
        {
            var message = event.data;
            if (message.type == "ready") 
            {
                log('<a href="'+ this.workerPath +'" download="ffmpeg-asm.js">ffmpeg-asm.js</a> file has been loaded.');
                this.workerReady = true;

                if (this.buffersReady) 
                    this.postMessage();
                else
                    console.log( "buffer is not ready" );
            
            } 
            else if (message.type == "stdout") 
            {
                log(message.data);
            }
            else if (message.type == "start") 
            {
                this.setState({"show_loading":true});
                log('<a href="'+ this.workerPath +'" download="ffmpeg-asm.js">ffmpeg-asm.js</a> file received ffmpeg command.');
            }
            else if (message.type == "done") 
            {
                console.log(JSON.stringify(message));
    
                var result = message.data[0];
                console.log(JSON.stringify(result));
    
                var blob = new Blob([result.data], {
                    type: 'video/mp4'
                });
    
                //console.log(JSON.stringify(blob));
    
                this.PostBlob(blob);
            }
        };
    }

    postMessage() 
    {
        console.log( "in  post message" );
        this.posted = true;
		
		/*
			[
                '-i', 'video.webm',
                '-i', 'audio.wav',
				'-s', '1280x720',
                '-c:v', 'mpeg4',
                '-c:a', 'aac',
                '-b:v', '1450k',
                '-b:a', '96k',
				'-bf', '2',
				'-g', '90',
				'-sc_threshold', '0',
				'-ar', '32000',
                '-strict', 'experimental', 'output.mp4'
            ]
		*/
		
		this.worker.postMessage({
            type: 'command',
            arguments: [
                '-loop', '1',
                '-i', 'cover.jpg',
                '-i', 'audio.mp3',
                '-q:v', '1',
               // '-c:a', 'copy', // or aac
                '-c:a', 'aac',
                '-b:v', '1450k',
                '-b:a', '96k',
				'-bf', '2',
				'-g', '90',
				'-sc_threshold', '0',
                '-ar', '32000',
                // aac
                '-strict','-2',
                '-shortest',
                'output.mp4'
            ],
            files: [
                {
                    data: new Uint8Array(this.cover_data),
                    name: 'cover.jpg',
                    type:'image/jpeg'
                },
                {
                    data: new Uint8Array(this.audio_data),
                    name: 'audio.mp3',
                    type:'audio/mp3'
                }
            ]
        });
    };

    PostBlob(blob)
    {
        
        FileSaver( blob , 'merged.mp4' );
        this.posted = false;
        this.setState({"show_loading":false});
        console.log( "done" );
        
        ///this.setState( {"download_url":URL.createObjectURL(blob)} )
    }
    
    render()
    {
        const main = <div>
            
            <div className=" center-800 top-100">
            <h1>jpg + mp3 合成 mp4</h1>
            <div className="oneline">
                <div className="left"> <ReactFileReader fileTypes={[".jpg"]} handleFiles={(e)=>this.cover_uploaded(e)}>
            <Button large={true} icon="media">选择一张jpg图片</Button>
            </ReactFileReader></div>
                <div className="middle">
                <ReactFileReader fileTypes={[".mp3"]} handleFiles={(e)=>this.audio_uploaded(e)}>
            <Button large={true} icon="music">选择一个mp3</Button>
            </ReactFileReader>
                </div>
                <div className="right">
                <Button large={true} icon="build" onClick={()=>this.convert()}>开始合成</Button>
                </div>
            </div>

            <div className="row center-800 top-20">
               {this.state.show_loading && <ProgressBar/> }
            </div>

            <div className="row center-800">
                { this.state.download_url && <a href={this.state.download_url}>Download Recorded Audio+Canvas file in MP4 container and play in VLC player!</a> }
            </div>

            <div className="link top-20"><Link to="/t2" >两个mp4合成一个</Link></div>

            </div>

            

        </div>;
        
        
        return <DocumentTitle title={this.props.store.appname}>{main}</DocumentTitle>;
    }
}

function log( info )
{
    console.log( info );
}